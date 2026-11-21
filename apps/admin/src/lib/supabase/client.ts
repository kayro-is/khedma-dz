'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@khedma/types';

import { publicEnv } from '@/lib/env';

/** Client Supabase côté navigateur (clé publique uniquement). */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
