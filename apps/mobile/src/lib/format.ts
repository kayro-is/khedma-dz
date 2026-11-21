/**
 * Formatage localisé (nombres, montants DZD, distances, dates). Logique pure, testée.
 * Les chiffres restent latins en arabe : c'est l'usage en Algérie (CLDR ar-DZ).
 */
import type { Locale } from '@khedma/types';

const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-DZ',
  ar: 'ar-DZ-u-nu-latn',
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

/** Nombre formaté selon la langue (séparateur de milliers, virgule décimale…). */
export function formatNumber(value: number, locale: Locale, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Montant DZD sans le symbole : les centimes ne sont affichés que s'ils existent.
 * Le symbole (« DA » / « د.ج ») vient des traductions (`currency.amount`).
 */
export function formatDzdNumber(amount: number, locale: Locale): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Distance approximative (jamais précise, pour protéger la localisation) :
 * < 1 km → null (affiché « moins de 1 km »), < 10 km → arrondi à 0,5 km, sinon au km.
 */
export function approximateDistanceKm(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 1) return null;
  if (km < 10) return Math.round(km * 2) / 2;
  return Math.round(km);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(toDate(value));
}

export function formatShortDate(value: Date | string, locale: Locale, now = new Date()): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
}

export type RelativeDay =
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'date'; date: string };

/** Pour les listes (messages, notifications) : « 14:05 », « Hier », « 3 mars ». */
export function relativeDay(value: Date | string, locale: Locale, now = new Date()): RelativeDay {
  const date = toDate(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return { kind: 'today', time: formatTime(date, locale) };
  if (isSameDay(date, yesterday)) return { kind: 'yesterday', time: formatTime(date, locale) };
  return { kind: 'date', date: formatShortDate(date, locale, now) };
}

/** Initiales pour un avatar sans photo (fonctionne aussi avec les noms arabes). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase();
}
