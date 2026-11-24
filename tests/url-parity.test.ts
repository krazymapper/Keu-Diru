// Garantit que la détection de doublons côté navigateur (TS) et côté base (SQL) concordent.
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { normalizeUrl } from '../src/lib/url';

const CASES: [string, string][] = [
  ['https://www.Example.org/Path/?b=2&a=1#frag', 'example.org/Path?a=1&b=2'],
  ['http://example.org:80/', 'example.org'],
  ['https://example.org:443/x/', 'example.org/x'],
  ['https://example.org/x?utm_source=mail&utm_medium=x&id=3', 'example.org/x?id=3'],
  ['https://example.org/?fbclid=abc', 'example.org'],
  ['  https://EXAMPLE.org/a//  ', 'example.org/a'],
  ['https://example.org/a?Z=1&a=2', 'example.org/a?Z=1&a=2'],
  ['https://example.org:8080/a', 'example.org:8080/a'],
  ['example.org/sans-schema', 'example.org/sans-schema'],
  ['https://docs.qgis.org/latest/en/docs/training_manual/', 'docs.qgis.org/latest/en/docs/training_manual'],
];

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  const sql = readFileSync('supabase/migrations/20261124000001_init_schema.sql', 'utf8');
  const fn = sql.match(/create or replace function public\.normalize_url[\s\S]*?\n\$\$;/)![0];
  await db.exec(fn);
});

describe('normalizeUrl', () => {
  it.each(CASES)('TS : %s', (input, expected) => expect(normalizeUrl(input)).toBe(expected));
  it.each(CASES)('SQL = TS : %s', async (input) => {
    const r = await db.query<{ n: string }>('select public.normalize_url($1) as n', [input]);
    expect(r.rows[0].n).toBe(normalizeUrl(input));
  });
});
