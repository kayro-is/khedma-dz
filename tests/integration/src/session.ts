/**
 * Sessions des comptes de démonstration, partagées au sein d'un fichier de test.
 * Une seule connexion par compte : la limite de connexions de Supabase Auth (environ 30 toutes
 * les 5 minutes par adresse IP) n'est pas atteinte par la suite complète.
 * Les parcours de connexion eux-mêmes sont testés à part (auth.test.ts), avec de vraies connexions.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@khedma/types';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

export const DEMO_PASSWORD = 'Khedma2026!';

const sessions = new Map<string, Promise<SupabaseClient<Database>>>();

export function signedIn(email: string): Promise<SupabaseClient<Database>> {
  let session = sessions.get(email);
  if (!session) {
    session = (async () => {
      const client = createClient<Database>(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
      if (error) throw error;
      return client;
    })();
    sessions.set(email, session);
    // Une connexion échouée n'est pas mise en cache.
    session.catch(() => sessions.delete(email));
  }
  return session;
}
