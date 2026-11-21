import { useTranslation } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import { isRtlLocale, isSupportedLocale, type Locale } from '@khedma/types';

import type { Script } from '@/theme';

export type Direction = {
  locale: Locale;
  /** Sens de mise en page effectif (natif : fixé au démarrage ; web : selon la langue). */
  isRTL: boolean;
  /** Script de la langue d'interface (choix de la police). */
  script: Script;
};

export function useDirection(): Direction {
  const { i18n } = useTranslation();
  const locale: Locale = isSupportedLocale(i18n.language) ? i18n.language : 'fr';
  const isRTL = Platform.OS === 'web' ? isRtlLocale(locale) : I18nManager.isRTL;
  return { locale, isRTL, script: locale === 'ar' ? 'arabic' : 'latin' };
}
