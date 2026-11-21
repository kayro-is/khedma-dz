import { describe, expect, it } from 'vitest';

import { directionOf, resolveLocale } from './config';
import ar from './dictionaries/ar.json';
import fr from './dictionaries/fr.json';

type Json = string | { [key: string]: Json };

function flatten(value: Json, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, child]) => ({ ...acc, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

describe('dictionnaires admin', () => {
  const frFlat = flatten(fr);
  const arFlat = flatten(ar);

  it('fr et ar ont les mêmes clés', () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(frFlat).sort());
  });

  it('aucune valeur vide', () => {
    for (const [key, value] of Object.entries({ ...frFlat, ...arFlat })) {
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });
});

describe('locale', () => {
  it('retombe sur le français si la valeur est inconnue', () => {
    expect(resolveLocale(undefined)).toBe('fr');
    expect(resolveLocale('en')).toBe('fr');
    expect(resolveLocale('ar')).toBe('ar');
  });

  it("l'arabe est RTL, le français LTR", () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('fr')).toBe('ltr');
  });
});
