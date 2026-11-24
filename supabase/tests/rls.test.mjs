// Tests d'accès et de règles métier — exécuter : npm run test:db
// Chaque test vérifie d'abord ce qui doit ÉCHOUER (02_RELAIS §9 : « tester les accès non autorisés »).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, as, USERS } from './harness.mjs';

let db;
before(async () => { db = await createDb(); });

const run = (user, sql, params = [], opts) => as(db, user, (tx) => tx.query(sql, params), opts);
async function rejects(user, sql, params, pattern) {
  await assert.rejects(() => run(user, sql, params), pattern);
}
const contribPayload = (over = {}) => JSON.stringify({
  slug: 'mon-cours-test', title: 'Mon cours de test', url: 'https://exemple.org/cours',
  description: 'Une description suffisamment longue pour passer.', type: 'course',
  discipline: 'informatique', language: 'fr', ...over,
});

test('RM-01 : un visiteur ne voit que le publié', async () => {
  await db.query(`insert into public.resources (slug, url, type_id, discipline_id, status)
    values ('brouillon-secret', 'https://secret.example/x', 1, 1, 'draft')`);
  const anon = await run(null, `select slug from public.resources where slug = 'brouillon-secret'`);
  assert.equal(anon.rows.length, 0);
  const editor = await run(USERS.eve, `select slug from public.resources where slug = 'brouillon-secret'`);
  assert.equal(editor.rows.length, 1);
  const search = await run(null, `select slug from public.search_resources('secret')`);
  assert.equal(search.rows.length, 0);
});

test('RM-16 : un visiteur ne peut rien écrire', async () => {
  await rejects(null, `insert into public.contributions (payload) values ('{}')`, [], /permission denied|row-level security/);
  await rejects(null, `update public.resources set status = 'withdrawn'`, [], /permission denied/);
});

test('RM-02 : une contribution est forcée en attente, au nom de son auteur', async () => {
  const r = await run(USERS.alice, `insert into public.contributions (payload, status, submitted_by)
    values ($1, 'approved', $2) returning status, submitted_by`, [contribPayload(), USERS.alice]);
  assert.equal(r.rows[0].status, 'pending');
  assert.equal(r.rows[0].submitted_by, USERS.alice);
  // tentative d'usurpation : le trigger réécrit l'auteur AVANT le contrôle RLS
  const spoof = await run(USERS.alice, `insert into public.contributions (payload, submitted_by) values ($1, $2) returning submitted_by`,
    [contribPayload(), USERS.bob]);
  assert.equal(spoof.rows[0].submitted_by, USERS.alice);
});

test('RM-14 : un membre ne voit pas les contributions des autres', async () => {
  await run(USERS.alice, `insert into public.contributions (payload) values ($1)`, [contribPayload({ slug: 'priv-alice' })], { commit: true });
  const bob = await run(USERS.bob, `select id from public.contributions where payload->>'slug' = 'priv-alice'`);
  assert.equal(bob.rows.length, 0);
  const mod = await run(USERS.mod, `select id from public.contributions where payload->>'slug' = 'priv-alice'`);
  assert.equal(mod.rows.length, 1);
});

test('Transitions : un membre ne peut pas s\'auto-approuver, mais peut retirer', async () => {
  await rejects(USERS.alice, `update public.contributions set status = 'approved' where payload->>'slug' = 'priv-alice'`,
    [], /invalid_status_transition/);
  const w = await run(USERS.alice, `update public.contributions set status = 'withdrawn'
    where payload->>'slug' = 'priv-alice' returning status`);
  assert.equal(w.rows[0].status, 'withdrawn');
});

test('Escalade de privilèges impossible', async () => {
  await rejects(USERS.alice, `insert into public.user_roles (user_id, role) values ($1, 'admin')`, [USERS.alice], /permission denied/);
  await rejects(USERS.alice, `select public.set_user_role($1, 'admin', true)`, [USERS.alice], /forbidden/);
  await rejects(USERS.root, `select public.set_user_role($1, 'admin', false)`, [USERS.root], /cannot_revoke_own_admin/);
});

test('§7 : modération atomique, séparation des tâches, publication visible', async () => {
  const c = await run(USERS.alice, `insert into public.contributions (payload) values ($1) returning id`,
    [contribPayload({ slug: 'cours-approuve', title: 'Cours approuvé par la modération' })], { commit: true });
  const id = c.rows[0].id;
  await rejects(USERS.alice, `select public.review_contribution($1, 'approved')`, [id], /forbidden/);
  await rejects(USERS.eve, `select public.review_contribution($1, 'approved')`, [id], /forbidden/); // éditeur ≠ modérateur
  await rejects(USERS.mod, `select public.review_contribution($1, 'needs_changes', 'court')`, [id], /reviews_comment_chk/);
  await run(USERS.mod, `select public.review_contribution($1, 'approved')`, [id], { commit: true });
  const pub = await run(null, `select r.status, t.title from public.resources r
    join public.resource_translations t on t.resource_id = r.id where r.slug = 'cours-approuve'`);
  assert.equal(pub.rows[0].status, 'published');
  await rejects(USERS.mod, `select public.review_contribution($1, 'approved')`, [id], /contribution_not_pending/);
  const audit = await db.query(`select action from public.audit_log where entity_id = $1`, [id]);
  assert.ok(audit.rows.some((a) => a.action === 'contribution.approved'));
  // le contributeur voit la décision le concernant
  const rev = await run(USERS.alice, `select decision from public.contribution_reviews where contribution_id = $1`, [id]);
  assert.equal(rev.rows[0].decision, 'approved');
});

test('Un modérateur ne peut pas valider sa propre contribution', async () => {
  const c = await run(USERS.mod, `insert into public.contributions (payload) values ($1) returning id`,
    [contribPayload({ slug: 'auto-modo' })], { commit: true });
  await rejects(USERS.mod, `select public.review_contribution($1, 'approved')`, [c.rows[0].id], /cannot_review_own/);
});

test('RM-06 : doublon probable signalé, jamais rejeté automatiquement', async () => {
  const r = await run(USERS.bob, `insert into public.contributions (payload) values ($1) returning status, duplicate_candidates`,
    [contribPayload({ slug: 'ne-dup', url: 'http://WWW.naturalearthdata.com/?utm_source=newsletter#top' })]);
  assert.equal(r.rows[0].status, 'pending');
  assert.equal(r.rows[0].duplicate_candidates.length, 1);
});

test('RM-13 : favoris strictement privés et uniquement sur du publié', async () => {
  const res = await db.query(`select id from public.resources where slug = 'wikidata'`);
  await run(USERS.alice, `insert into public.favorites (user_id, resource_id) values ($1, $2)`, [USERS.alice, res.rows[0].id], { commit: true });
  const bob = await run(USERS.bob, `select * from public.favorites`);
  assert.equal(bob.rows.length, 0);
  await rejects(USERS.bob, `insert into public.favorites (user_id, resource_id) values ($1, $2)`, [USERS.alice, res.rows[0].id], /row-level security/);
  const draft = await db.query(`select id from public.resources where slug = 'brouillon-secret'`);
  await rejects(USERS.bob, `insert into public.favorites (user_id, resource_id) values ($1, $2)`, [USERS.bob, draft.rows[0].id], /resource_not_published/);
});

test('RM-18 : seul un admin supprime, et la suppression est journalisée', async () => {
  const del = await run(USERS.eve, `delete from public.resources where slug = 'tatoeba' returning id`);
  assert.equal(del.rows.length, 0); // RLS : 0 ligne, pas d'erreur
  await run(USERS.root, `delete from public.resources where slug = 'brouillon-secret'`, [], { commit: true });
  const audit = await db.query(`select 1 from public.audit_log where action = 'resource.deleted'`);
  assert.equal(audit.rows.length, 1);
  const memberAudit = await run(USERS.alice, `select * from public.audit_log`);
  assert.equal(memberAudit.rows.length, 0);
});

test('Anti-flood : 20 contributions ouvertes maximum par membre', async () => {
  await assert.rejects(() => as(db, USERS.bob, async (tx) => {
    for (let i = 0; i < 21; i++) await tx.query(`insert into public.contributions (payload) values ($1)`, [contribPayload({ slug: `flood-${i}` })]);
  }), /too_many_open_contributions/);
});

test('RM-09 : la recherche affiche la traduction de la langue d\'interface', async () => {
  const fr = await run(null, `select title, display_language from public.search_resources('wikidata', 'fr')`);
  assert.equal(fr.rows[0].display_language, 'fr');
  const en = await run(null, `select title from public.search_resources('QGIS', 'en')`);
  assert.equal(en.rows[0].title, 'QGIS Training Manual');
});
