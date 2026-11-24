// Vérifie les liens du seed et classe chaque résultat selon RM-08.
// RAPPORT uniquement : n'écrit rien en base. Un échec isolé ≠ lien cassé :
// le passage à « broken » doit être confirmé par un humain ou par 2 contrôles consécutifs.
import { readFileSync } from 'node:fs';

const { resources } = JSON.parse(readFileSync(new URL('../data/seed/resources.json', import.meta.url), 'utf8'));
const UA = 'KEU-DIRU-linkcheck/0.1 (+https://github.com/krazymapper/Keu-Diru)';

export function classify(status, error) {
  if (error) return 'temporarily_unreachable';
  if (status >= 200 && status < 400) return 'ok';
  if (status === 401 || status === 403) return 'restricted';
  if (status === 404 || status === 410) return 'broken';
  if (status === 429 || status >= 500) return 'temporarily_unreachable';
  return 'temporarily_unreachable';
}

async function check(url) {
  const opts = { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': UA } };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD' });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { ...opts, method: 'GET' }); // HEAD refusé
    return { status: res.status, link_status: classify(res.status) };
  } catch (e) {
    return { status: null, link_status: classify(null, e), error: String(e.cause?.code ?? e.name) };
  }
}

const out = [];
for (const r of resources.filter((x) => x.url)) {
  out.push({ slug: r.slug, url: r.url, checked_at: new Date().toISOString(), ...(await check(r.url)) });
  await new Promise((ok) => setTimeout(ok, 500)); // politesse envers les serveurs
}
console.log(JSON.stringify(out, null, 2));
