/**
 * Recherche instantanée dans une liste locale (wilayas, communes, options) — logique pure, testée.
 * Bilingue : chaque élément est indexé sur son libellé et ses mots-clés (autre langue, code),
 * normalisés comme côté base (accents, tashkil, variantes arabes, ponctuation).
 * Classement : début du libellé, puis début d'un mot, puis contenu, puis contenu sans espaces
 * (« bousaada » trouve « Bou Saâda »). L'ordre d'origine est conservé à score égal.
 */
import { normalizeForSearch } from '@/i18n/utils';

export type Searchable = { label: string; keywords?: string };

export type SearchIndex<T extends Searchable> = readonly {
  item: T;
  text: string;
  compact: string;
}[];

export function buildSearchIndex<T extends Searchable>(items: readonly T[]): SearchIndex<T> {
  return items.map((item) => {
    const text = normalizeForSearch(`${item.label} ${item.keywords ?? ''}`);
    return { item, text, compact: text.replace(/ /g, '') };
  });
}

function score(entry: { text: string; compact: string }, needle: string, compactNeedle: string) {
  if (entry.text.startsWith(needle)) return 0;
  if (entry.text.includes(` ${needle}`)) return 1;
  if (entry.text.includes(needle)) return 2;
  if (compactNeedle.length >= 3 && entry.compact.includes(compactNeedle)) return 3;
  return -1;
}

export function searchIndex<T extends Searchable>(index: SearchIndex<T>, query: string): T[] {
  const needle = normalizeForSearch(query);
  if (!needle) return index.map((entry) => entry.item);
  const compactNeedle = needle.replace(/ /g, '');
  return index
    .map((entry, position) => ({ entry, position, rank: score(entry, needle, compactNeedle) }))
    .filter((r) => r.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.position - b.position)
    .map((r) => r.entry.item);
}

/** Tri alphabétique selon la langue de l'interface (arabe ou français). */
export function sortByLabel<T extends { label: string }>(items: readonly T[], locale: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return [...items].sort((a, b) => collator.compare(a.label, b.label));
}
