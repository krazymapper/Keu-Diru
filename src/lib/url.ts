/**
 * Normalisation d'URL pour la détection de doublons (RM-06).
 * MIROIR de public.normalize_url() (supabase/migrations/...001) : toute
 * modification doit être répercutée des deux côtés — tests/url-parity.test.ts
 * échoue sinon.
 */
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref)(=|$)/i;

export function normalizeUrl(raw: string): string {
  let u = raw.trim().split('#')[0];
  const m = u.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]+/);
  if (!m) return u.toLowerCase();
  let host = m[0].toLowerCase();
  let rest = u.slice(m[0].length);
  host = host.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:(80|443)$/, '');
  const qIndex = rest.indexOf('?');
  let query = '';
  if (qIndex >= 0) {
    query = rest.slice(qIndex + 1).split('?')[0];
    rest = rest.slice(0, qIndex);
  }
  const kept = query
    .split('&')
    .filter((p) => p !== '' && !TRACKING.test(p))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); // ordre binaire, comme le tri SQL en collation "C"
  rest = rest.replace(/\/+$/, '');
  return host + rest + (kept.length ? '?' + kept.join('&') : '');
}
