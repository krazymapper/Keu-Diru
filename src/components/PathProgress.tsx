import { useEffect, useState } from 'react';
import { useT, href, type Locale } from '../i18n';
import { readJSON, writeJSON, progressKey } from '../lib/storage';
import { useHydrated } from '../lib/useHydrated';

interface Step { index: number; title: string | null; slug: string | null; instruction: string | null }

/** Progression privée par défaut (RM-12) — locale tant que l'authentification n'est pas active. */
export default function PathProgress({ path, steps, lang }: { path: string; steps: Step[]; lang: Locale }) {
  const t = useT(lang);
  const [done, setDone] = useState<number[]>([]);
  const ready = useHydrated();
  useEffect(() => setDone(readJSON<number[]>(progressKey(path), [])), [path]);

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i].sort((a, b) => a - b);
    setDone(next);
    writeJSON(progressKey(path), next);
  };
  const pct = Math.round((done.length / steps.length) * 100);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-muted mb-2">{t('paths.progress', { done: done.length, total: steps.length })}</p>
        <div className="h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ol className="space-y-4">
        {steps.map((s) => {
          const isDone = done.includes(s.index);
          return (
            <li key={s.index} className={`card p-5 flex gap-4 ${isDone ? 'opacity-75' : ''}`}>
              <span className="font-serif text-3xl text-accent leading-none w-8 shrink-0" aria-hidden>{s.index}</span>
              <div className="flex-1 min-w-0">
                <p className="eyebrow mb-1">{t('paths.step', { n: s.index })}</p>
                {s.slug && s.title && (
                  <h3 className="text-lg font-semibold mb-1"><a href={href(lang, `/resources/${s.slug}`)} className="hover:underline">{s.title}</a></h3>
                )}
                {s.instruction && <p className="text-muted">{s.instruction}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm shrink-0 self-start cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={isDone} disabled={!ready} onChange={() => toggle(s.index)} className="size-5 accent-[var(--color-accent)]" />
                {t('paths.done')}
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
