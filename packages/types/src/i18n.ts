/** Langues supportées dès le MVP. */
export const SUPPORTED_LOCALES = ['fr', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export const RTL_LOCALES: readonly Locale[] = ['ar'];

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Texte traduit stocké en base (catégories, wilayas, communes…). */
export type LocalizedText = Record<Locale, string>;
