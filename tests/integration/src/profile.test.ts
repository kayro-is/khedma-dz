/**
 * KHD-005 — Profil, localisation et photo via les vraies API du projet de TEST.
 * Chaque modification est annulée en fin de test (données de démonstration intactes).
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';

import type { Database } from '@khedma/types';
import { profileUpdateSchema } from '@khedma/validation';

import { signedIn } from './session';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const AMINA = '11111111-1111-4111-8111-111111111111';
const KARIM = '22222222-2222-4222-8222-222222222222';
// JPEG 1×1 valide (image de test).
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  ),
  (c) => c.charCodeAt(0),
);

const cleanups: (() => Promise<unknown>)[] = [];
afterAll(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
});

describe('profil', () => {
  it('lit son profil complet (public + privé + localisation)', async () => {
    const amina = await signedIn('amina@khedma.test');
    const [pub, priv] = await Promise.all([
      amina.from('profiles').select('first_name, last_name, avatar_path').eq('id', AMINA).single(),
      amina
        .from('profile_private')
        .select('phone, locale, commune:communes(name_fr, wilaya:wilayas(code))')
        .eq('user_id', AMINA)
        .single(),
    ]);
    expect(pub.data).toMatchObject({ first_name: 'Amina', last_name: 'Belkacem' });
    expect(priv.data?.phone).toBe('+213555000001');
  });

  it('modifie nom, téléphone et commune (valeurs validées par le schéma Zod partagé)', async () => {
    const amina = await signedIn('amina@khedma.test');
    const hydra = await amina.from('communes').select('id').eq('name_fr', 'Hydra').single();
    const values = profileUpdateSchema.parse({
      firstName: 'Amina',
      lastName: 'Belkacem-Test',
      phone: '0555 00 00 09',
      communeId: hydra.data?.id ?? null,
    });

    cleanups.push(async () => {
      const a = await signedIn('amina@khedma.test');
      await a.from('profiles').update({ last_name: 'Belkacem' }).eq('id', AMINA);
      await a
        .from('profile_private')
        .update({ phone: '+213555000001', commune_id: null })
        .eq('user_id', AMINA);
    });

    const names = await amina
      .from('profiles')
      .update({ last_name: values.lastName })
      .eq('id', AMINA);
    const priv = await amina
      .from('profile_private')
      .update({ phone: values.phone, commune_id: values.communeId })
      .eq('user_id', AMINA);
    expect(names.error).toBeNull();
    expect(priv.error).toBeNull();

    const check = await amina
      .from('profile_private')
      .select('phone, phone_verified_at, commune:communes(name_fr, wilaya:wilayas(code))')
      .eq('user_id', AMINA)
      .single();
    expect(check.data).toMatchObject({
      phone: '+213555000009',
      phone_verified_at: null,
      commune: { name_fr: 'Hydra', wilaya: { code: '16' } },
    });
  });

  it('refuse un numéro déjà utilisé par un autre compte (23505)', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina
      .from('profile_private')
      .update({ phone: '+213555000002' }) // numéro de Karim
      .eq('user_id', AMINA);
    expect(error?.code).toBe('23505');
  });

  it('ne lit ni ne modifie les données privées d’un autre utilisateur', async () => {
    const karim = await signedIn('karim@khedma.test');
    const read = await karim.from('profile_private').select('phone').eq('user_id', AMINA);
    expect(read.data).toEqual([]);
    const write = await karim
      .from('profile_private')
      .update({ commune_id: null })
      .eq('user_id', AMINA)
      .select();
    expect(write.data).toEqual([]);
  });

  it('ne peut pas modifier son statut de compte', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina.from('profiles').update({ status: 'SUSPENDED' }).eq('id', AMINA);
    expect(error?.code).toBe('42501');
  });
});

describe('photo de profil (bucket avatars)', () => {
  it('envoie une photo dans son dossier, publiquement lisible, puis la retire', async () => {
    const amina = await signedIn('amina@khedma.test');
    const path = `${AMINA}/avatar-test-${Date.now()}.jpg`;
    cleanups.push(async () => {
      const a = await signedIn('amina@khedma.test');
      await a.storage.from('avatars').remove([path]);
      await a.from('profiles').update({ avatar_path: null }).eq('id', AMINA);
    });

    // Même format d'envoi que l'application : ArrayBuffer limité aux octets du JPEG.
    const body = TINY_JPEG.buffer.slice(
      TINY_JPEG.byteOffset,
      TINY_JPEG.byteOffset + TINY_JPEG.byteLength,
    );
    const upload = await amina.storage
      .from('avatars')
      .upload(path, body, { contentType: 'image/jpeg', upsert: false });
    expect(upload.error).toBeNull();
    const update = await amina.from('profiles').update({ avatar_path: path }).eq('id', AMINA);
    expect(update.error).toBeNull();

    // URL d'affichage publique (bucket public) : le contenu relu est exactement l'image envoyée.
    const publicUrl = amina.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const response = await fetch(publicUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    const stored = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(stored)).toEqual(Array.from(TINY_JPEG));
    expect(Array.from(stored.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);

    // Le profil relu (comme après redémarrage de l'application) pointe vers ce fichier.
    const reread = await amina.from('profiles').select('avatar_path').eq('id', AMINA).single();
    expect(reread.data?.avatar_path).toBe(path);
  });

  it('refuse l’envoi dans le dossier d’un autre utilisateur', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina.storage
      .from('avatars')
      .upload(`${KARIM}/intrusion-${Date.now()}.jpg`, TINY_JPEG, { contentType: 'image/jpeg' });
    expect(error).not.toBeNull();
  });

  it('refuse un format non autorisé', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina.storage
      .from('avatars')
      .upload(`${AMINA}/script-${Date.now()}.html`, new TextEncoder().encode('<script></script>'), {
        contentType: 'text/html',
      });
    expect(error).not.toBeNull();
  });
});

describe('suppression de compte', () => {
  it('n’est pas accessible sans être connecté', async () => {
    const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const { error } = await anon.rpc('delete_my_account');
    expect(error).not.toBeNull();
  });
});
