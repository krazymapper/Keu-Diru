import { describe, it, expect } from 'vitest';
import fr from '../src/i18n/fr';
import en from '../src/i18n/en';

describe('i18n', () => {
  it('FR et EN ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });
  it('aucune traduction vide', () => {
    for (const d of [fr, en]) for (const [k, v] of Object.entries(d)) expect(v.trim(), k).not.toBe('');
  });
  it('les variables {x} sont identiques dans les deux langues', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(fr) as (keyof typeof fr)[]) expect(vars(en[k]), k).toBe(vars(fr[k]));
  });
});
