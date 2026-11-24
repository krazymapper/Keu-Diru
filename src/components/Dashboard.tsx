import { useEffect, useState } from 'react';
import { Heart, Route, Inbox, ShieldCheck } from 'lucide-react';
import { useT, href, withBase, type Locale } from '../i18n';
import { readJSON, FAVORITES_KEY, progressKey } from '../lib/storage';

interface PathInfo { slug: string; title: string; total: number }

export default function Dashboard({ lang, paths }: { lang: Locale; paths: PathInfo[] }) {
  const t = useT(lang);
  const [favs, setFavs] = useState<{ slug: string; title: string }[] | null>(null);
  const [progress, setProgress] = useState<(PathInfo & { done: number })[]>([]);

  useEffect(() => {
    const slugs = readJSON<string[]>(FAVORITES_KEY, []);
    setProgress(paths.map((p) => ({ ...p, done: readJSON<number[]>(progressKey(p.slug), []).length })).filter((p) => p.done > 0));
    if (slugs.length === 0) { setFavs([]); return; }
    fetch(withBase('/catalog.json')).then((r) => r.json()).then((d) => {
      const bySlug = new Map(d.resources.map((r: any) => [r.slug, r]));
      // une ressource retirée du catalogue disparaît des favoris affichés, sans erreur
      setFavs(slugs.filter((s) => bySlug.has(s)).map((s) => {
        const r: any = bySlug.get(s);
        return { slug: s, title: (r.t[lang] ?? Object.values(r.t)[0]).title };
      }));
    }).catch(() => setFavs([]));
  }, [lang, paths]);

  const Panel = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="card p-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">{icon}{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Panel icon={<Heart className="size-5 text-accent" aria-hidden />} title={t('dash.favorites')}>
        {favs === null ? <p className="text-muted">…</p> : favs.length === 0 ? <p className="text-muted">{t('dash.noFav')}</p> : (
          <ul className="divide-y divide-line">
            {favs.map((f) => <li key={f.slug} className="py-2"><a href={href(lang, `/resources/${f.slug}`)} className="hover:underline">{f.title}</a></li>)}
          </ul>
        )}
      </Panel>
      <Panel icon={<Route className="size-5 text-accent" aria-hidden />} title={t('dash.progress')}>
        {progress.length === 0 ? <p className="text-muted">{t('dash.noProgress')}</p> : (
          <ul className="space-y-3">
            {progress.map((p) => (
              <li key={p.slug}>
                <a href={href(lang, `/paths/${p.slug}`)} className="hover:underline font-medium">{p.title}</a>
                <p className="text-sm text-muted">{t('paths.progress', { done: p.done, total: p.total })}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel icon={<Inbox className="size-5 text-muted" aria-hidden />} title={t('dash.contributions')}>
        <p className="text-muted">{t('dash.contribSoon')}</p>
      </Panel>
      <Panel icon={<ShieldCheck className="size-5 text-muted" aria-hidden />} title={t('dash.moderation')}>
        <p className="text-muted">{t('dash.moderationSoon')}</p>
      </Panel>
    </div>
  );
}
