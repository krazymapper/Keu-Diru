import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { useT, href, withBase, type Locale } from '../i18n';
import { contributionSchema, LEVELS, COSTS } from '../lib/schema';
import { normalizeUrl } from '../lib/url';
import { useHydrated } from '../lib/useHydrated';

type Opt = { slug: string; label: string };
interface Props {
  lang: Locale;
  types: Opt[];
  disciplines: Opt[];
  languages: { code: string; native_name: string }[];
  repoUrl: string;
}
const EMPTY = {
  title: '', url: '', access_note: '', type: '', discipline: '', language: '', level: 'unknown',
  access_cost: 'unknown', description: '', author: '', publisher: '', license: '',
};

export default function ContributeForm({ lang, types, disciplines, languages, repoUrl }: Props) {
  const t = useT(lang);
  const [v, setV] = useState<Record<string, string>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [known, setKnown] = useState<Map<string, { slug: string; title: string }>>(new Map());
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = useHydrated();

  useEffect(() => {
    fetch(withBase('/catalog.json')).then((r) => r.json()).then((d) => {
      setKnown(new Map(d.resources.filter((r: any) => r.url).map((r: any) => [
        normalizeUrl(r.url), { slug: r.slug, title: (r.t[lang] ?? Object.values(r.t)[0]).title },
      ])));
    }).catch(() => { /* la détection de doublons est un confort, pas un blocage */ });
  }, [lang]);

  const duplicate = useMemo(() => {
    if (!/^https?:\/\//i.test(v.url)) return null;
    return known.get(normalizeUrl(v.url)) ?? null;
  }, [v.url, known]);

  const set = (k: string) => (e: { target: { value: string } }) => {
    setV({ ...v, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: '' });
    setResult(null);
  };

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = contributionSchema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        const code = ['min3', 'min40', 'url', 'access'].includes(issue.message) ? issue.message : 'required';
        errs[key] ??= t(`err.${code}` as any);
      }
      setErrors(errs);
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    // Champs vides => absents : on n'invente rien (RM-03, RM-04)
    const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, x]) => x !== '' && x !== 'unknown'));
    setResult(JSON.stringify(payload, null, 2));
  };

  const issueUrl = result
    ? `${repoUrl}/issues/new?${new URLSearchParams({
        title: `[Ressource] ${v.title}`.slice(0, 200),
        labels: 'nouvelle-ressource',
        body: `Proposition soumise depuis le formulaire KEU DIRU.\n\n\`\`\`json\n${result}\n\`\`\``.slice(0, 6000),
      })}`
    : '#';

  const field = (k: string, labelKey: string, input: React.ReactNode, optional = false) => (
    <div>
      <label htmlFor={`f-${k}`} className="block font-medium mb-1.5">
        {t(labelKey as any)} {optional && <span className="text-muted font-normal text-sm">({t('contribute.optional')})</span>}
      </label>
      {input}
      {errors[k] && <p id={`e-${k}`} className="text-bad text-sm mt-1" role="alert">{errors[k]}</p>}
    </div>
  );
  const common = (k: string) => ({
    id: `f-${k}`, value: v[k], onChange: set(k), className: 'field',
    'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? `e-${k}` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate method="post" action="#" className="space-y-5">
      {field('title', 'contribute.field.title', <input {...common('title')} required maxLength={300} />)}
      {field('url', 'contribute.field.url', <input {...common('url')} type="url" inputMode="url" placeholder="https://" />)}
      {duplicate && (
        <p className="card p-3 text-sm bg-accent-soft border-accent" role="status">
          {t('contribute.duplicate')} <a href={href(lang, `/resources/${duplicate.slug}`)} className="font-semibold">{duplicate.title}</a>
        </p>
      )}
      {!v.url && field('access_note', 'contribute.field.access', <input {...common('access_note')} maxLength={500} />, true)}
      <div className="grid sm:grid-cols-2 gap-5">
        {field('type', 'contribute.field.type', (
          <select {...common('type')} required><option value="">{t('contribute.choose')}</option>{types.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select>
        ))}
        {field('discipline', 'contribute.field.discipline', (
          <select {...common('discipline')} required><option value="">{t('contribute.choose')}</option>{disciplines.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select>
        ))}
        {field('language', 'contribute.field.language', (
          <select {...common('language')}><option value="">{t('contribute.langUnknown')}</option>{languages.map((l) => <option key={l.code} value={l.code}>{l.native_name}</option>)}</select>
        ))}
        {field('level', 'contribute.field.level', (
          <select {...common('level')}>{LEVELS.map((x) => <option key={x} value={x}>{t(`level.${x}` as any)}</option>)}</select>
        ))}
        {field('access_cost', 'contribute.field.cost', (
          <select {...common('access_cost')}>{COSTS.map((x) => <option key={x} value={x}>{t(`cost.${x}` as any)}</option>)}</select>
        ))}
      </div>
      {field('description', 'contribute.field.description', <textarea {...common('description')} rows={5} maxLength={5000} />)}
      <div className="grid sm:grid-cols-3 gap-5">
        {field('author', 'contribute.field.author', <input {...common('author')} />, true)}
        {field('publisher', 'contribute.field.publisher', <input {...common('publisher')} />, true)}
        {field('license', 'contribute.field.license', <input {...common('license')} placeholder="CC BY 4.0, MIT…" />, true)}
      </div>
      <button type="submit" disabled={!ready} className="btn btn-primary disabled:opacity-60">{t('contribute.submit')}</button>

      {result && (
        <div className="card p-5 space-y-3" role="status">
          <p>{t('contribute.demo')}</p>
          <pre className="bg-paper border border-line rounded-md p-3 text-xs overflow-x-auto">{result}</pre>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary" href={issueUrl} target="_blank" rel="noopener">{t('contribute.github')}</a>
            <button type="button" className="btn btn-ghost" onClick={() => {
              navigator.clipboard?.writeText(result).then(() => setCopied(true), () => setCopied(false));
            }}>{copied ? t('contribute.copied') : t('contribute.copy')}</button>
          </div>
        </div>
      )}
    </form>
  );
}
