import fr from './fr';
import en from './en';

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

const dict = { fr, en } satisfies Record<Locale, Record<string, string>>;
export type MessageKey = keyof typeof fr;

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** t('key', { n: 3 }) — repli FR puis clé brute (visible en recette, jamais de chaîne vide). */
export function useT(lang: Locale) {
  return (key: MessageKey, vars?: Record<string, string | number>) => {
    let s: string = dict[lang][key] ?? dict.fr[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

/**
 * Préfixe un chemin avec la base de déploiement. Gère BASE_URL avec ou sans « / » final
 * (bug classique GitHub Pages : liens en « /Keu-Difr/... » ou « //fr »).
 */
export function withBase(path: string): string {
  // Aperçu : chemins relatifs à la balise <base> calculée par page (voir Base.astro)
  if (import.meta.env.PUBLIC_PREVIEW_FILE_LINKS === '1') return path.replace(/^\/+/, '') || './';
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}` || '/';
}

/**
 * Lien interne vers une page localisée. PUBLIC_PREVIEW_FILE_LINKS=1 (aperçu sur un hébergeur
 * sans résolution de dossier) produit « …/index.html » explicite ; inactif en production.
 */
export function href(lang: Locale, path = ''): string {
  let p = `/${lang}${path ? (path.startsWith('/') ? path : `/${path}`) : '/'}`;
  if (import.meta.env.PUBLIC_PREVIEW_FILE_LINKS === '1') p = p.replace(/\/?$/, '/index.html');
  return withBase(p);
}

export function localeStaticPaths() {
  return LOCALES.map((lang) => ({ params: { lang } }));
}
