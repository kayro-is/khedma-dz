/**
 * KHD-007 — Référentiel géographique via les vraies API du projet de TEST (après import).
 * Toute modification de profil est annulée en fin de test.
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';

import type { Database } from '@khedma/types';

import { signedIn } from './session';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const AMINA = '11111111-1111-4111-8111-111111111111';
const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });

const cleanups: (() => Promise<unknown>)[] = [];
afterAll(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
});

describe('référentiel géographique', () => {
  it('expose 69 wilayas, triées par code, avec noms français et arabes', async () => {
    const { data, error } = await anon
      .from('wilayas')
      .select('id, code, name_fr, name_ar')
      .order('code');
    expect(error).toBeNull();
    expect(data).toHaveLength(69);
    expect(data?.[0]).toMatchObject({ code: '01', name_fr: 'Adrar' });
    expect(data?.[68]).toMatchObject({ code: '69', name_fr: 'El Abiodh Sidi Cheikh' });
  });

  it('expose 1 541 communes, chacune avec un code officiel', async () => {
    const all = await anon.from('communes').select('id', { count: 'exact', head: true });
    const coded = await anon
      .from('communes')
      .select('id', { count: 'exact', head: true })
      .not('official_code', 'is', null);
    expect(all.count).toBe(1541);
    expect(coded.count).toBe(1541);
  });

  it('charge les communes d’une nouvelle wilaya à la demande (Aflou, 12 communes)', async () => {
    const { data, error } = await anon
      .from('communes')
      .select('official_code, name_fr, name_ar')
      .eq('wilaya_id', 59)
      .order('name_fr');
    expect(error).toBeNull();
    expect(data).toHaveLength(12);
    expect(data?.find((c) => c.official_code === '0319')).toMatchObject({
      name_fr: 'Aflou',
      name_ar: 'أفلو',
    });
  });

  it('refuse toute modification du référentiel par un utilisateur', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina
      .from('communes')
      .update({ name_fr: 'Intrusion' })
      .eq('official_code', '0319');
    expect(error?.code).toBe('42501');
  });

  it('permet de rattacher son profil à une commune d’une nouvelle wilaya', async () => {
    const amina = await signedIn('amina@khedma.test');
    const before = await amina
      .from('profile_private')
      .select('commune_id')
      .eq('user_id', AMINA)
      .single();
    cleanups.push(async () => {
      const a = await signedIn('amina@khedma.test');
      await a
        .from('profile_private')
        .update({ commune_id: before.data?.commune_id ?? null })
        .eq('user_id', AMINA);
    });

    const aflou = await amina.from('communes').select('id').eq('official_code', '0319').single();
    const update = await amina
      .from('profile_private')
      .update({ commune_id: aflou.data?.id ?? null })
      .eq('user_id', AMINA);
    expect(update.error).toBeNull();

    const check = await amina
      .from('profile_private')
      .select('commune:communes(name_fr, wilaya:wilayas(code, name_ar))')
      .eq('user_id', AMINA)
      .single();
    expect(check.data?.commune).toMatchObject({
      name_fr: 'Aflou',
      wilaya: { code: '59', name_ar: 'أفلو' },
    });
  });
});
