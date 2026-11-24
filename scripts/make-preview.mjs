// Construit un aperçu 100 % relatif (dist-preview/) pour un hébergeur sans résolution de dossiers.
// N'affecte pas la production. Usage : node scripts/make-preview.mjs
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

execSync('npx astro build --outDir dist-preview', {
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: '/', PUBLIC_PREVIEW_FILE_LINKS: '1', ASSETS_DIR: 'assets' },
});
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const f of walk('dist-preview').filter((f) => f.endsWith('.html'))) {
  const s = readFileSync(f, 'utf8').replace(/="\/assets\//g, '="assets/');
  writeFileSync(f, s);
}
console.log('Aperçu prêt : dist-preview/');
