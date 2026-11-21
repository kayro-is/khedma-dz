import { VALIDATION_MESSAGES } from '@khedma/validation';
import { describe, expect, it } from 'vitest';

import ar from './locales/ar.json';
import fr from './locales/fr.json';
import searchCases from '../../../../supabase/tests/fixtures/search-normalization.json';
import { flattenKeys, normalizeForSearch, pickSupportedLocale } from './utils';

function getPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], obj);
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (key: string) => key.replace(PLURAL_SUFFIX, '');
const uniq = (keys: string[]) => [...new Set(keys)].sort();

describe('fichiers de traduction', () => {
  const frKeys = flattenKeys(fr);
  const arKeys = flattenKeys(ar);
  const pluralBases = uniq(frKeys.filter((k) => PLURAL_SUFFIX.test(k)).map(baseKey));

  it('fr et ar couvrent exactement les mêmes clés (hors suffixes de pluriel)', () => {
    expect(uniq(arKeys.map(baseKey))).toEqual(uniq(frKeys.map(baseKey)));
  });

  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('%s ne contient aucune traduction vide', (_, dict) => {
    for (const key of flattenKeys(dict)) {
      const value = getPath(dict, key);
      expect(typeof value, key).toBe('string');
      expect((value as string).trim().length, key).toBeGreaterThan(0);
    }
  });

  // Les catégories de pluriel requises sont celles qu'utilise réellement i18next (Intl.PluralRules).
  it.each([
    ['fr', frKeys],
    ['ar', arKeys],
  ])('%s fournit toutes les formes de pluriel nécessaires', (lang, keys) => {
    const rules = new Intl.PluralRules(lang);
    const needed = uniq([0, 1, 2, 3, 5, 11, 100, 101, 1000000].map((n) => rules.select(n)));
    for (const base of pluralBases) {
      for (const category of needed) {
        expect(keys, `${base}_${category}`).toContain(`${base}_${category}`);
      }
    }
  });

  it('les interpolations {{…}} sont identiques dans les deux langues (clés non plurielles)', () => {
    const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
    for (const key of frKeys.filter((k) => !PLURAL_SUFFIX.test(k))) {
      expect(vars(getPath(ar, key) as string), key).toEqual(vars(getPath(fr, key) as string));
    }
  });

  it('toutes les clés de validation partagées sont traduites', () => {
    for (const key of Object.values(VALIDATION_MESSAGES)) {
      expect(frKeys, key).toContain(key);
      expect(arKeys, key).toContain(key);
    }
  });
});

describe('pickSupportedLocale', () => {
  it.each<[(string | null)[], string]>([
    [['ar-DZ'], 'ar'],
    [['fr_FR'], 'fr'],
    [['en-US', 'ar'], 'ar'],
    [['en', 'de'], 'fr'],
    [[null], 'fr'],
    [[], 'fr'],
  ])('%j → %s', (codes, expected) => {
    expect(pickSupportedLocale(codes)).toBe(expected);
  });
});

describe('normalizeForSearch', () => {
  // Cas partagés avec private.normalize_search (PostgreSQL), vérifiés aussi côté base.
  it.each(searchCases as [string, string][])('%s → %s', (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });

  it('retrouve une commune quelle que soit la graphie saisie', () => {
    const name = normalizeForSearch('Ksar El Boukhari');
    expect(name.includes(normalizeForSearch('ksar el-boukhari'))).toBe(true);
    expect(normalizeForSearch('قصر البخاري').includes(normalizeForSearch('البخاري'))).toBe(true);
  });
});
