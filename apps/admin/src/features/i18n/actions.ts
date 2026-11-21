'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { isSupportedLocale } from '@khedma/types';

import { LOCALE_COOKIE } from '@/i18n/config';

export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = formData.get('locale');
  if (!isSupportedLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
}
