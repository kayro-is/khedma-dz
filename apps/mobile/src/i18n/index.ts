/**
 * Initialisation i18n de l'application mobile (français LTR / arabe RTL).
 *
 * - La langue choisie est persistée (AsyncStorage — donnée non sensible).
 * - Au premier lancement, aucune langue n'est enregistrée : l'écran de choix est affiché.
 * - Sous React Native, le sens de mise en page (I18nManager) n'est appliqué qu'au
 *   démarrage : changer entre fr et ar impose un redémarrage, géré par `applyLocale`.
 */
// Pluriels arabes (6 formes) : i18next s'appuie sur Intl.PluralRules.
// Le polyfill ne s'installe que si le moteur JS ne le fournit pas.
import 'intl-pluralrules';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { I18nManager, Platform } from 'react-native';
import { initReactI18next } from 'react-i18next';

import { isRtlLocale, isSupportedLocale, type Locale } from '@khedma/types';

import ar from './locales/ar.json';
import fr from './locales/fr.json';
import { pickSupportedLocale } from './utils';

const LOCALE_STORAGE_KEY = 'khedma.locale';
// Évite une boucle de redémarrages si le natif refuse d'appliquer le RTL (ex. Expo Go limité).
const RTL_RELOAD_GUARD_KEY = 'khedma.rtlReloadFor';

export const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

/** Instance dédiée à l'application (fournie via <I18nextProvider>). */
const i18n = createInstance();

async function readStoredLocale(): Promise<Locale | null> {
  try {
    const value = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function getDeviceLocale(): Locale {
  return pickSupportedLocale(getLocales().map((l) => l.languageCode));
}

function applyWebDirection(locale: Locale) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }
}

/** Vrai si la direction native actuelle ne correspond pas à la langue. */
function directionMismatch(locale: Locale): boolean {
  return Platform.OS !== 'web' && I18nManager.isRTL !== isRtlLocale(locale);
}

function setNativeDirection(locale: Locale) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRtlLocale(locale));
}

export type I18nBootstrap = {
  /** false au premier lancement : l'utilisateur doit choisir sa langue. */
  hasChosenLocale: boolean;
};

let localeChosen = false;

/** false tant que l'utilisateur n'a jamais choisi de langue (premier lancement). */
export function hasChosenLocale(): boolean {
  return localeChosen;
}

/**
 * À appeler une seule fois avant le premier rendu (splash screen visible).
 * Si la direction native ne correspond pas à la langue enregistrée, la corrige
 * et redémarre une fois.
 */
export async function initI18n(): Promise<I18nBootstrap> {
  const stored = await readStoredLocale();
  const locale = stored ?? getDeviceLocale();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: 'fr',
      supportedLngs: ['fr', 'ar'],
      interpolation: { escapeValue: false }, // React échappe déjà
      returnNull: false,
    });
  }
  applyWebDirection(locale);

  if (directionMismatch(locale)) {
    const guard = await AsyncStorage.getItem(RTL_RELOAD_GUARD_KEY).catch(() => null);
    if (guard !== locale) {
      await AsyncStorage.setItem(RTL_RELOAD_GUARD_KEY, locale).catch(() => undefined);
      setNativeDirection(locale);
      await reloadAppAsync('Application de la direction de lecture');
    } else if (__DEV__) {
      console.warn(`[i18n] Direction native non appliquée pour "${locale}" après redémarrage.`);
    }
  } else {
    await AsyncStorage.removeItem(RTL_RELOAD_GUARD_KEY).catch(() => undefined);
  }

  localeChosen = stored !== null;
  return { hasChosenLocale: localeChosen };
}

export type ApplyLocaleResult = { restartRequired: boolean };

/**
 * Enregistre et applique une langue. Si le sens de lecture change (fr ↔ ar),
 * retourne `restartRequired: true` : l'appelant doit l'expliquer à l'utilisateur
 * puis appeler `restartApp()`.
 */
export async function applyLocale(locale: Locale): Promise<ApplyLocaleResult> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  localeChosen = true;
  await i18n.changeLanguage(locale);
  applyWebDirection(locale);

  if (directionMismatch(locale)) {
    setNativeDirection(locale);
    return { restartRequired: true };
  }
  return { restartRequired: false };
}

export async function restartApp(): Promise<void> {
  await reloadAppAsync('Changement de langue');
}

export function currentLocale(): Locale {
  const lng = i18n.resolvedLanguage;
  return isSupportedLocale(lng) ? lng : 'fr';
}

export default i18n;
