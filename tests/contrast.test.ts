// Contrastes WCAG 2.1 des couleurs de thème (clair et sombre), lus directement dans global.css.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/global.css', 'utf8');
const block = (re: RegExp) => Object.fromEntries([...(css.match(re)?.[1] ?? '').matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = block(/@theme\s*\{([\s\S]*?)\n\}/);
const dark = block(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\}/);
const darkMedia = block(/:root:not\(\[data-theme='light'\]\)\s*\{([\s\S]*?)\}/);

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [texte, fond, minimum]
const PAIRS: [string, string, number][] = [
  ['ink', 'paper', 4.5], ['ink', 'card', 4.5], ['muted', 'paper', 4.5], ['muted', 'card', 4.5],
  ['accent', 'paper', 4.5], ['accent', 'card', 4.5], ['on-accent', 'accent', 4.5], ['on-accent', 'accent-strong', 4.5],
  ['ink', 'accent-soft', 4.5], ['on-banner', 'banner', 4.5],
  ['ok', 'card', 4.5], ['warn', 'card', 4.5], ['bad', 'card', 4.5], ['bad', 'paper', 4.5],
  ['indigo', 'paper', 3], // anneau de focus : contraste non textuel ≥ 3:1
];

describe.each([['clair', light], ['sombre', dark]])('thème %s', (_name, theme) => {
  it.each(PAIRS)('%s sur %s ≥ %s:1', (fg, bg, min) => {
    expect(theme[fg], fg).toBeDefined();
    expect(theme[bg], bg).toBeDefined();
    expect(ratio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
  });
});

it('le sombre « système » et le sombre « forcé » sont identiques', () => expect(darkMedia).toEqual(dark));
