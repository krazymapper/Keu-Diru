/* KEU DIRU — service worker (RM-17 : cache prudent)
 * - Pages HTML : réseau d'abord, cache en secours (hors ligne).
 * - Assets versionnés (/_astro/*) : cache d'abord (noms hachés = immuables).
 * - catalog.json : stale-while-revalidate (recherche hors ligne).
 * - JAMAIS mis en cache : autre origine (Supabase, auth), requêtes non-GET,
 *   requêtes avec en-tête Authorization.
 * Chemins RELATIFS au scope : fonctionne sous /Keu-Diru/ comme à la racine.
 */
const VERSION = 'v1';
const CACHE = `keudiru-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname;
const PRECACHE = ['fr/', 'en/', 'catalog.json', 'favicon.svg', 'manifest.webmanifest'].map((p) => SCOPE + p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('keudiru-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('Authorization')) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  if (url.pathname.includes('/_astro/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetchAndPut(req)));
  } else if (url.pathname.endsWith('/catalog.json')) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetchAndPut(req).catch(() => hit);
      return hit || net;
    }));
  } else if (req.mode === 'navigate') {
    e.respondWith(fetchAndPut(req).catch(() =>
      caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || caches.match(SCOPE + (url.pathname.startsWith(SCOPE + 'en') ? 'en/' : 'fr/'))),
    ));
  }
});

async function fetchAndPut(req) {
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}
