/**
 * Vérifie la connexion et les autorisations à travers les vraies API (Auth + PostgREST),
 * comme le fera l'application mobile. Nécessite `pnpm db:reset` (données de démonstration).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '@khedma/types';

import { signedIn } from './session';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const AMINA = '11111111-1111-4111-8111-111111111111';
const KARIM = '22222222-2222-4222-8222-222222222222';
const LEAK_REQUEST = 'a0000000-0000-4000-8000-000000000001'; // plomberie à Hydra

function anon(): SupabaseClient<Database> {
  return createClient<Database>(url as string, anonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe('connexion et référentiels', () => {
  it('un visiteur lit les catégories actives', async () => {
    const { data, error } = await anon().from('categories').select('slug, name_fr, name_ar');
    expect(error).toBeNull();
    expect(data?.length).toBe(12);
  });

  it('un visiteur ne lit pas les profils', async () => {
    const { data } = await anon().from('profiles').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('un mauvais mot de passe est refusé', async () => {
    const { error } = await anon().auth.signInWithPassword({
      email: 'amina@khedma.test',
      password: 'mauvais',
    });
    expect(error).not.toBeNull();
  });
});

// Pas d'inscription réelle ici : en Cloud, chaque inscription envoie un e-mail de confirmation
// (adresses fictives = rebonds pénalisés par Supabase). La création automatique du profil à
// l'inscription est couverte par les tests pgTAP (01_profiles_roles).
describe('comptes de démonstration', () => {
  it('un compte du seed dispose de son profil et de ses rôles', async () => {
    const sofiane = await signedIn('sofiane@khedma.test');
    const { data } = await sofiane.from('user_roles').select('role').order('role');
    expect(data).toEqual([{ role: 'PARTICULIER' }, { role: 'ARTISAN' }]);
  });
});

describe('RLS via API', () => {
  it('un utilisateur ne lit que ses propres données privées', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { data } = await amina.from('profile_private').select('user_id, phone');
    expect(data).toEqual([{ user_id: AMINA, phone: '+213555000001' }]);
  });

  it('un artisan compatible voit la demande, un autre non', async () => {
    const karim = await signedIn('karim@khedma.test');
    const yacine = await signedIn('yacine@khedma.test');
    const seen = await karim.from('service_requests').select('id').eq('id', LEAK_REQUEST);
    const hidden = await yacine.from('service_requests').select('id').eq('id', LEAK_REQUEST);
    expect(seen.data).toHaveLength(1);
    expect(hidden.data).toHaveLength(0);
  });

  it('un artisan ne peut pas se déclarer vérifié', async () => {
    const karim = await signedIn('karim@khedma.test');
    const { error } = await karim
      .from('artisan_profiles')
      .update({ verification_status: 'VERIFIED' })
      .eq('user_id', KARIM);
    expect(error?.code).toBe('42501');
  });

  it('la note affichée correspond aux avis réels', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { data } = await amina
      .from('artisan_profiles')
      .select('rating_avg, review_count')
      .eq('user_id', KARIM)
      .single();
    expect(data).toEqual({ rating_avg: 5, review_count: 1 });
  });
});
