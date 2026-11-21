/**
 * Opérations d'authentification (Supabase Auth). Chaque fonction renvoie un résultat typé ;
 * les erreurs sont converties en clé i18n, jamais affichées brutes.
 */
import * as Linking from 'expo-linking';

import type { Locale } from '@khedma/types';
import type { SignInValues, SignUpValues } from '@khedma/validation';

import { supabase } from '@/services/supabase';

import { authErrorKey, type AuthErrorKey } from './authErrors';

export type AuthResult = { ok: true } | { ok: false; error: AuthErrorKey };

const ok: AuthResult = { ok: true };
const failure = (error: unknown): AuthResult => ({ ok: false, error: authErrorKey(error) });

/**
 * URL de retour après clic dans l'e-mail : khedmadz://auth-callback (application installée)
 * ou exp://…/--/auth-callback (Expo Go). Toutes deux autorisées dans Supabase (Redirect URLs).
 */
export function authRedirectUrl(next?: 'reset-password'): string {
  return Linking.createURL('auth-callback', next ? { queryParams: { next } } : undefined);
}

export async function signUp(values: SignUpValues, locale: Locale): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: authRedirectUrl(),
        // Lues et revalidées par le trigger private.handle_new_user (profil, téléphone, langue).
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          locale,
          terms_accepted: 'true',
        },
      },
    });
    // Adresse déjà inscrite : Supabase répond sans erreur (pas d'énumération) → même écran « vérifiez vos e-mails ».
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}

export async function signIn(values: SignInValues): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword(values);
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl('reset-password'),
    });
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}

/** Échange le code à usage unique du lien e-mail contre une session (vérificateur PKCE local). */
export async function exchangeCode(code: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? failure(error) : ok;
  } catch (error) {
    return failure(error);
  }
}
