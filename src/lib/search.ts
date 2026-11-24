/**
 * Recherche plein texte CÔTÉ CLIENT sur l'index statique (catalog.json).
 * Choix assumé pour GitHub Pages + connexions variables : instantané, hors ligne.
 * Limite : pertinent jusqu'à quelques milliers de ressources (≈1–2 Mo d'index).
 * Au-delà, basculer sur public.search_resources() (Supabase) — voir 03_AUDIT §4.
 */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const STOP = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'the', 'of', 'and', 'a', 'an', 'to', 'for', 'in', 'pour']);

export function tokenize(q: string): string[] {
  return fold(q).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w));
}

export interface Searchable {
  title: string;
  description: string;
  extra: string; // éditeur, sujets, autres traductions…
}

/** Score > 0 si TOUS les mots sont trouvés (préfixe accepté : « cartograph » ⊂ « cartographiques »). */
export function score(doc: Searchable, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const title = fold(doc.title);
  const desc = fold(doc.description);
  const extra = fold(doc.extra);
  let total = 0;
  for (const tk of tokens) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u');
    const s = (re.test(title) ? 5 : 0) + (re.test(desc) ? 2 : 0) + (re.test(extra) ? 1 : 0);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}
