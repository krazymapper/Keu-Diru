// Vérifie que chaque lien/asset interne d'un build statique pointe vers un fichier existant.
// Usage : node scripts/check-internal-links.mjs <dossier> <base>   ex. dist /Keu-Diru
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir = 'dist', base = '/'] = process.argv.slice(2);
const origin = 'http://site.local';
const root = new URL(base.endsWith('/') ? base : base + '/', origin);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const toFile = (u) => {
  if (!u.pathname.startsWith(root.pathname)) return null;
  let p = decodeURIComponent(u.pathname.slice(root.pathname.length));
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  return existsSync(f) && statSync(f).isFile() ? f : existsSync(join(f, 'index.html')) ? join(f, 'index.html') : null;
};
let checked = 0;
const broken = [];
for (const file of walk(dir).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(dir.length + 1).replace(/\\/g, '/');
  const pageUrl = new URL(rel.replace(/index\.html$/, ''), root);
  const baseTag = html.match(/<base href="([^"]+)"/)?.[1];
  const resolveFrom = baseTag ? new URL(baseTag, pageUrl) : pageUrl;
  for (const [, attr, val] of html.matchAll(/\b(href|src|component-url|renderer-url|action)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(val) && !val.startsWith(origin)) continue;
    const u = new URL(val.replace(/&amp;/g, '&'), resolveFrom);
    if (u.origin !== origin) continue;
    checked++;
    if (!toFile(u)) broken.push(`${rel} → ${attr}="${val}"`);
  }
}
console.log(`${checked} liens internes vérifiés, ${broken.length} cassé(s)`);
if (broken.length) { console.log(broken.slice(0, 30).join('\n')); process.exit(1); }
