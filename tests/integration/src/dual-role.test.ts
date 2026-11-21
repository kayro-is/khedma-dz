/**
 * KHD-006 — Double rôle Particulier / Artisan via les vraies API du projet de TEST.
 * Aucune donnée n'est modifiée : seules des lectures et des tentatives interdites sont faites
 * (l'activation réelle, irréversible sans clé d'administration, est couverte par pgTAP).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '@khedma/types';
import { artisanActivationSchema } from '@khedma/validation';

import { signedIn } from './session';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const AMINA = '11111111-1111-4111-8111-111111111111'; // Particulier uniquement
const KARIM = '22222222-2222-4222-8222-222222222222'; // Particulier + Artisan

const rolesOf = async (client: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await client.from('user_roles').select('role').eq('user_id', userId);
  expect(error).toBeNull();
  return (data ?? []).map((r) => r.role).sort();
};

describe('rôles : une seule identité, deux espaces', () => {
  it('un artisan possède les deux rôles sur le même compte, et lit son profil artisan', async () => {
    const karim = await signedIn('karim@khedma.test');
    expect(await rolesOf(karim, KARIM)).toEqual(['ARTISAN', 'PARTICULIER']);
    const { data } = await karim
      .from('artisan_profiles')
      .select('business_name')
      .eq('user_id', KARIM)
      .single();
    expect(data?.business_name).toBe('Karim Plomberie');
  });

  it('un particulier n’a que le rôle PARTICULIER et aucun profil artisan', async () => {
    const amina = await signedIn('amina@khedma.test');
    expect(await rolesOf(amina, AMINA)).toEqual(['PARTICULIER']);
    const { data } = await amina
      .from('artisan_profiles')
      .select('user_id')
      .eq('user_id', AMINA)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it('les rôles d’un autre utilisateur sont illisibles, et invisibles sans connexion', async () => {
    const amina = await signedIn('amina@khedma.test');
    expect(await rolesOf(amina, KARIM)).toEqual([]);
    const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await anon.from('user_roles').select('role');
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

describe('sécurité : changer de mode ne donne aucune permission', () => {
  it('impossible de s’attribuer le rôle ARTISAN directement', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina.from('user_roles').insert({ user_id: AMINA, role: 'ARTISAN' });
    expect(error?.code).toBe('42501');
    expect(await rolesOf(amina, AMINA)).toEqual(['PARTICULIER']);
  });

  it('sans rôle ARTISAN, les actions artisan sont refusées par le serveur', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina
      .from('portfolio_items')
      .insert({ artisan_id: AMINA, title: 'Tentative' });
    expect(error?.code).toBe('42501');
  });

  it('impossible d’activer l’espace Artisan d’un autre compte', async () => {
    const amina = await signedIn('amina@khedma.test');
    const commune = await amina.from('communes').select('id').eq('official_code', '1628').single();
    const category = await amina.from('categories').select('id').eq('slug', 'plomberie').single();
    // Données valides selon le schéma partagé de l'application : seul le compte cible est interdit.
    const values = artisanActivationSchema.parse({
      businessName: 'Usurpation',
      categoryId: category.data?.id,
      communeId: commune.data?.id,
      yearsExperience: '',
    });
    const { error } = await amina.from('artisan_profiles').insert({
      user_id: KARIM,
      business_name: values.businessName,
      primary_category_id: values.categoryId,
      base_commune_id: values.communeId,
    });
    expect(error).not.toBeNull();
  });

  it('impossible de s’activer en se déclarant vérifié (colonne protégée)', async () => {
    const amina = await signedIn('amina@khedma.test');
    const commune = await amina.from('communes').select('id').eq('official_code', '1628').single();
    const category = await amina.from('categories').select('id').eq('slug', 'plomberie').single();
    const { error } = await amina.from('artisan_profiles').insert({
      user_id: AMINA,
      business_name: 'Faux vérifié',
      primary_category_id: category.data?.id as string,
      base_commune_id: commune.data?.id as number,
      verification_status: 'VERIFIED',
    });
    expect(error?.code).toBe('42501');
    expect(await rolesOf(amina, AMINA)).toEqual(['PARTICULIER']);
  });
});
