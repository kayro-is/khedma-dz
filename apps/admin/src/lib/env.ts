import { assertPublicSupabaseKey } from '@khedma/validation';

/**
 * Variables publiques de l'administration (exposées au navigateur).
 * La clé secrète n'est JAMAIS lue ici : elle sera réservée à un module `server-only`
 * dédié (KHD-017), jamais importable côté client.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Configuration manquante : ${name}. Copiez .env.example vers apps/admin/.env.local.`,
    );
  }
  return value.trim();
}

const supabaseAnonKey = required(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
// Refuse de démarrer si une clé secrète a été placée dans une variable NEXT_PUBLIC_.
assertPublicSupabaseKey(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const publicEnv = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey,
};
