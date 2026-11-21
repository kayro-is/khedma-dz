import { assertPublicSupabaseKey } from '@khedma/validation';

/**
 * Variables publiques de l'application (incluses dans le bundle : aucune donnée secrète).
 * Expo n'injecte que les accès statiques `process.env.EXPO_PUBLIC_*` : ne pas les rendre dynamiques.
 */
export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function parsePublicEnv(raw: {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
}): PublicEnv {
  const missing: string[] = [];
  if (!raw.supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!raw.supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Configuration manquante : ${missing.join(', ')}. Copiez .env.example vers apps/mobile/.env (voir README).`,
    );
  }

  let url: URL;
  try {
    url = new URL(raw.supabaseUrl as string);
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL doit être une URL valide.');
  }
  const isLocal = /^(127\.0\.0\.1|localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
    url.hostname,
  );
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL doit utiliser HTTPS (HTTP accepté uniquement en réseau local).',
    );
  }
  // Refuse de démarrer avec une clé secrète (elle serait lisible par quiconque décompile l'app).
  assertPublicSupabaseKey(raw.supabaseAnonKey as string, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return { supabaseUrl: url.origin, supabaseAnonKey: (raw.supabaseAnonKey as string).trim() };
}

export const env = parsePublicEnv({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
