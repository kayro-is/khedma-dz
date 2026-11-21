import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@khedma/types';

import { env } from './env';
import { secureSessionStorage } from './secureSessionStorage';

/**
 * Client Supabase unique de l'application.
 * - Clé publique uniquement : toutes les autorisations reposent sur la RLS côté serveur.
 * - Session chiffrée (AES-256-GCM), clé protégée par le Keychain / Keystore du téléphone.
 * - Flux PKCE : les liens reçus par e-mail ne transportent qu'un code à usage unique,
 *   échangé sur CET appareil (jamais de jeton dans l'URL).
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Recommandation Supabase : ne rafraîchir le jeton que lorsque l'application est au premier plan.
// Au retour au premier plan, un jeton expiré est renouvelé (ou la session terminée s'il est révoqué).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
