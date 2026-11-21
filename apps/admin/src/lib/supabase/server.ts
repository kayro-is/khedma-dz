import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@khedma/types';

import { publicEnv } from '@/lib/env';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers),
 * agissant avec la session de l'administrateur connecté : la RLS et `private.is_admin()`
 * s'appliquent. Aucune clé privilégiée n'est utilisée.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appel depuis un Server Component : les cookies sont rafraîchis par le proxy de session (KHD-017).
        }
      },
    },
  });
}
