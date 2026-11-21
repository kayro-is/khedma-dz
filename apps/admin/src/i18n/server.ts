import 'server-only';

import { cookies } from 'next/headers';

import type { Locale } from '@khedma/types';

import { LOCALE_COOKIE, resolveLocale } from './config';
import ar from './dictionaries/ar.json';
import fr from './dictionaries/fr.json';

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, ar };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
