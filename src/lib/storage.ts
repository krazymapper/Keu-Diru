/**
 * Stockage local tolérant aux pannes (navigation privée, quota, iframes…).
 * Ne JAMAIS y mettre de jeton, secret ou donnée privée d'un autre membre (RM-17).
 * Clés versionnées pour permettre une migration vers Supabase sans conflit.
 */
const PREFIX = 'keudiru:v1:';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
    globalThis.dispatchEvent?.(new CustomEvent('keudiru:storage', { detail: key }));
  } catch {
    /* stockage indisponible : la fonction reste utilisable pour la session */
  }
}

export const FAVORITES_KEY = 'favorites';
export const progressKey = (pathSlug: string) => `progress:${pathSlug}`;
