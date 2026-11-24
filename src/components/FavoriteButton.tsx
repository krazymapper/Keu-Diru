import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useT, type Locale } from '../i18n';
import { readJSON, writeJSON, FAVORITES_KEY } from '../lib/storage';
import { useHydrated } from '../lib/useHydrated';

/** Favoris locaux en attendant Supabase Auth (RM-17 : pas de données privées d'autrui, pas de jeton). */
export default function FavoriteButton({ slug, lang }: { slug: string; lang: Locale }) {
  const t = useT(lang);
  const [fav, setFav] = useState(false);
  const ready = useHydrated();
  useEffect(() => setFav(readJSON<string[]>(FAVORITES_KEY, []).includes(slug)), [slug]);

  const toggle = () => {
    const list = readJSON<string[]>(FAVORITES_KEY, []);
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    writeJSON(FAVORITES_KEY, next);
    setFav(next.includes(slug));
  };

  return (
    <div>
      <button type="button" onClick={toggle} aria-pressed={fav} disabled={!ready} className="btn btn-ghost disabled:opacity-60">
        <Heart className={`size-4 ${fav ? 'fill-accent text-accent' : ''}`} aria-hidden />
        {fav ? t('fav.remove') : t('fav.add')}
      </button>
      <p className="text-xs text-muted mt-1">{t('fav.localNote')}</p>
    </div>
  );
}
