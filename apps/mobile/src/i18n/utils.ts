/**
 * Utilitaires i18n purs (sans dépendance React Native) — testables avec Vitest.
 */
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from '@khedma/types';

/** Choisit la première langue supportée parmi les codes fournis par l'appareil. */
export function pickSupportedLocale(languageCodes: readonly (string | null | undefined)[]): Locale {
  for (const code of languageCodes) {
    const base = code?.toLowerCase().split(/[-_]/)[0];
    if (isSupportedLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

// Diacritiques arabes (tashkil), tatweel, et signes coraniques.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
// Diacritiques latins après décomposition NFD.
const LATIN_DIACRITICS = /[̀-ͯ]/g;
const APOSTROPHES = /['’‘`´]/g;
const SEPARATORS = /[-‐‑–—.,;:/()_]/g;

/**
 * Normalise un texte pour la recherche bilingue (français / arabe / darija translittérée) :
 * minuscules, accents latins retirés, tashkil retiré, variantes de alef / ya / ta marbuta unifiées.
 * La hamza sur support est volontairement repliée (ئ → ي, ؤ → و, أ → ا) : l'utilisateur
 * la saisit rarement, et la requête comme le texte indexé passent par la même fonction.
 * La ponctuation des noms propres est neutralisée : apostrophes retirées (« M'Sila » = « msila »),
 * tirets, points et barres remplacés par des espaces (« Alger-Centre » = « alger centre »).
 * Règle identique à private.normalize_search (PostgreSQL), vérifiée sur les mêmes cas :
 * supabase/tests/fixtures/search-normalization.json.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(LATIN_DIACRITICS, '')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(APOSTROPHES, '')
    .replace(SEPARATORS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Liste les clés (chemins pointés) d'un fichier de traduction. */
export function flattenKeys(value: Json, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}
