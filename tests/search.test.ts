import { describe, it, expect } from 'vitest';
import { score, tokenize, fold } from '../src/lib/search';

describe('recherche client', () => {
  it('insensible aux accents et à la casse', () => expect(fold('Données ÉCONOMIQUES')).toBe('donnees economiques'));
  it('ignore les mots vides', () => expect(tokenize('les données de la santé')).toEqual(['donnees', 'sante']));
  it('accepte les préfixes', () => expect(score({ title: 'Cartographie libre', description: '', extra: '' }, ['cartograph'])).toBeGreaterThan(0));
  it('exige tous les mots', () => expect(score({ title: 'Python', description: 'cours', extra: '' }, ['python', 'climat'])).toBe(0));
  it('le titre pèse plus que la description', () => {
    const a = score({ title: 'QGIS', description: '', extra: '' }, ['qgis']);
    const b = score({ title: 'Autre', description: 'QGIS', extra: '' }, ['qgis']);
    expect(a).toBeGreaterThan(b);
  });
  it('résiste aux caractères spéciaux regex', () => expect(() => score({ title: 'C++', description: '', extra: '' }, tokenize('c++ (x'))).not.toThrow());
});
