// Banc d'essai local : exécute les VRAIES migrations dans PGlite (Postgres WASM)
// avec un bouchon minimal du schéma `auth` de Supabase. Ne remplace pas un test
// sur un projet Supabase réel (voir 03_AUDIT §6), mais attrape la majorité des
// erreurs de schéma et de RLS avant déploiement.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
`;

export const USERS = {
  alice: '00000000-0000-0000-0000-00000000000a', // membre
  bob: '00000000-0000-0000-0000-00000000000b',   // membre
  eve: '00000000-0000-0000-0000-00000000000e',   // éditrice
  mod: '00000000-0000-0000-0000-0000000000dd',   // modérateur
  root: '00000000-0000-0000-0000-0000000000ff',  // admin
};

export async function createDb() {
  const db = new PGlite({ extensions: { pg_trgm, unaccent } });
  await db.exec(AUTH_STUB);
  const dir = join(root, 'supabase', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(dir, f), 'utf8'));
    } catch (e) {
      throw new Error(`Migration ${f} : ${e.message}`);
    }
  }
  const { buildSeedSql } = await import(join(root, 'scripts', 'build-seed-sql.mjs'));
  try {
    await db.exec(buildSeedSql());
  } catch (e) {
    throw new Error(`Seed : ${e.message}`);
  }
  for (const id of Object.values(USERS)) await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.exec(`
    insert into public.user_roles (user_id, role) values
      ('${USERS.eve}', 'editor'), ('${USERS.mod}', 'moderator'), ('${USERS.root}', 'admin');
  `);
  return db;
}

/** Exécute fn dans une transaction en tant qu'utilisateur (null = anon), puis annule. */
export async function as(db, userId, fn, { commit = false } = {}) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    const result = await fn(tx);
    if (!commit) await tx.rollback();
    return result;
  });
}
