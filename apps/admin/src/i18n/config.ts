import { DEFAULT_LOCALE, isRtlLocale, isSupportedLocale, type Locale } from '@khedma/types';

export const LOCALE_COOKIE = 'khedma_locale';

export function resolveLocale(value: string | undefined | null): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function directionOf(locale: Locale): 'rtl' | 'ltr' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
