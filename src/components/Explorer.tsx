import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { Search, X } from 'lucide-react';
import { useT, href, withBase, type Locale } from '../i18n';
import { score, tokenize } from '../lib/search';

type Labels = Record<string, string>;
interface Index {
  disciplines: { slug: string; labels: Labels }[];
  types: { slug: string; labels: Labels }[];
  languages: { code: string; native_name: string }[];
  topics: { slug: string; labels: Labels }[];
  resources: {
    slug: string; type: string; discipline: string; lang: string | null; level: string; cost: string;
    publisher: string | null; topics: string[]; link: string; url: string | null;
    t: Record<string, { title: string; description: string }>;
  }[];
}
type FilterKey = 'discipline' | 'type' | 'level' | 'lang' | 'cost';
const FILTER_KEYS: FilterKey[] = ['discipline', 'type', 'level', 'lang', 'cost'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'all_levels'];
const COSTS = ['free', 'freemium', 'paid', 'institutional'];

const lbl = (l: Labels | undefined, lang: string) => (l ? l[lang] ?? l.fr ?? Object.values(l)[0] : '');

function readParams() {
  const p = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, p.get(k) ?? ''])) as Record<FilterKey, string>;
  return { q: p.get('q') ?? '', f };
}

export default function Explorer({ lang }: { lang: Locale }) {
  const t = useT(lang);
  const [data, setData] = useState<Index | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<FilterKey, string>>({ discipline: '', type: '', level: '', lang: '', cost: '' });
  const dq = useDeferredValue(q);

  // Lecture de l'URL après hydratation (évite un écart SSR/client)
  useEffect(() => {
    const init = readParams();
    setQ(init.q);
    setF(init.f);
    const ctrl = new AbortController();
    fetch(withBase('/catalog.json'), { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch((e) => { if (e?.name !== 'AbortError') setError(true); });
    return () => ctrl.abort();
  }, []);

  // URL partageable (replaceState : pas de pollution de l'historique à chaque frappe)
  useEffect(() => {
    if (!data) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    for (const k of FILTER_KEYS) if (f[k]) p.set(k, f[k]);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, [q, f, data]);

  const tokens = useMemo(() => tokenize(dq), [dq]);

  const scored = useMemo(() => {
    if (!data) return [];
    const topicLabel = new Map(data.topics.map((tp) => [tp.slug, Object.values(tp.labels).join(' ')]));
    return data.resources
      .map((r) => {
        const tr = r.t[lang] ?? (r.lang ? r.t[r.lang] : undefined) ?? Object.values(r.t)[0];
        const others = Object.values(r.t).map((x) => `${x.title} ${x.description}`).join(' ');
        const s = score({ title: tr.title, description: tr.description, extra: `${r.publisher ?? ''} ${r.topics.map((x) => topicLabel.get(x)).join(' ')} ${others}` }, tokens);
        return { r, tr, s };
      })
      .filter((x) => x.s > 0);
  }, [data, tokens, lang]);

  const matches = (r: Index['resources'][number], except?: FilterKey) =>
    FILTER_KEYS.every((k) => k === except || !f[k] || (k === 'lang' ? r.lang : (r as any)[k]) === f[k]);

  const results = useMemo(
    () => scored.filter(({ r }) => matches(r)).sort((a, b) => b.s - a.s || a.tr.title.localeCompare(b.tr.title, lang)),
    [scored, f, lang],
  );

  // Compteurs de facettes : calculés en ignorant le filtre de la facette elle-même
  const counts = (key: FilterKey, value: string) =>
    scored.filter(({ r }) => matches(r, key) && (key === 'lang' ? r.lang : (r as any)[key]) === value).length;

  if (error) return <p role="alert" className="card p-6 text-bad">{t('explore.error')}</p>;
  if (!data) return <p className="text-muted py-12" aria-live="polite">{t('explore.loading')}</p>;

  const options: Record<FilterKey, { value: string; label: string }[]> = {
    discipline: data.disciplines.map((d) => ({ value: d.slug, label: lbl(d.labels, lang) })),
    type: data.types.map((d) => ({ value: d.slug, label: lbl(d.labels, lang) })),
    level: LEVELS.map((v) => ({ value: v, label: t(`level.${v}` as any) })),
    lang: [...new Set(data.resources.map((r) => r.lang).filter(Boolean) as string[])].map((c) => ({
      value: c, label: data.languages.find((l) => l.code === c)?.native_name ?? c.toUpperCase(),
    })),
    cost: COSTS.map((v) => ({ value: v, label: t(`cost.${v}` as any) })),
  };
  const filterTitle: Record<FilterKey, string> = {
    discipline: t('filter.discipline'), type: t('filter.type'), level: t('filter.level'), lang: t('filter.language'), cost: t('filter.cost'),
  };
  const active = q.trim() !== '' || FILTER_KEYS.some((k) => f[k]);
  const disc = new Map(data.disciplines.map((d) => [d.slug, d.labels]));
  const typ = new Map(data.types.map((d) => [d.slug, d.labels]));

  return (
    <div className="grid lg:grid-cols-[17rem_1fr] gap-8">
      <aside aria-label={t('filter.all')} className="space-y-5">
        <label className="relative block">
          <span className="sr-only">{t('home.search.placeholder')}</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.search.placeholder')} className="field pl-9" autoComplete="off" />
        </label>
        {FILTER_KEYS.map((k) => (
          <label key={k} className="block">
            <span className="eyebrow block mb-1.5">{filterTitle[k]}</span>
            <select className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
              <option value="">{t('filter.all')}</option>
              {options[k].map((o) => {
                const n = counts(k, o.value);
                return <option key={o.value} value={o.value} disabled={n === 0 && f[k] !== o.value}>{o.label} ({n})</option>;
              })}
            </select>
          </label>
        ))}
        {active && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => { setQ(''); setF({ discipline: '', type: '', level: '', lang: '', cost: '' }); }}>
            <X className="size-4" aria-hidden /> {t('explore.reset')}
          </button>
        )}
      </aside>
      <section aria-live="polite" aria-busy={q !== dq}>
        <p className="text-sm text-muted mb-4">{t('explore.results', { n: results.length })}</p>
        {results.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="mb-4">{t('explore.empty')}</p>
            <a className="btn btn-primary" href={href(lang, '/contribute')}>{t('nav.contribute')}</a>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {results.map(({ r, tr }) => (
              <li key={r.slug}>
                <article className="card p-5 flex flex-col gap-3 h-full hover:border-ink transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="eyebrow">{lbl(typ.get(r.type), lang)}</span>
                    <span className="text-xs text-muted">· {lbl(disc.get(r.discipline), lang)}</span>
                  </div>
                  <h2 className="text-xl font-semibold"><a href={href(lang, `/resources/${r.slug}`)} className="hover:underline">{tr.title}</a></h2>
                  <p className="text-[0.95rem] text-muted line-clamp-3">{tr.description}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {r.lang && <span className="chip uppercase">{r.lang}</span>}
                    <span className="chip">{t(`level.${r.level}` as any)}</span>
                    <span className="chip">{t(`cost.${r.cost}` as any)}</span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
