/**
 * KHD-008 — Profil artisan professionnel via les vraies API du projet de TEST (après migration).
 * Chaque modification est annulée en fin de test ; les fichiers envoyés sont supprimés.
 */
import { afterAll, describe, expect, it } from 'vitest';

import { artisanProfileSchema } from '@khedma/validation';

import { signedIn } from './session';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const KARIM = '22222222-2222-4222-8222-222222222222'; // artisan publié (seed)
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  ),
  (c) => c.charCodeAt(0),
);
const body = () =>
  TINY_JPEG.buffer.slice(TINY_JPEG.byteOffset, TINY_JPEG.byteOffset + TINY_JPEG.byteLength);

const cleanups: (() => Promise<unknown>)[] = [];
afterAll(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
});

describe('informations professionnelles', () => {
  it('l’artisan modifie description et disponibilité (valeurs validées par le schéma partagé)', async () => {
    const karim = await signedIn('karim@khedma.test');
    const before = await karim
      .from('artisan_profiles')
      .select('description, availability')
      .eq('user_id', KARIM)
      .single();
    cleanups.push(async () => {
      const k = await signedIn('karim@khedma.test');
      await k
        .from('artisan_profiles')
        .update({
          description: before.data?.description ?? null,
          availability: before.data?.availability ?? 'AVAILABLE',
        })
        .eq('user_id', KARIM);
    });
    const values = artisanProfileSchema.parse({
      businessName: 'Karim Plomberie',
      description: 'Plomberie générale, chauffe-eau et dépannage rapide à Alger et environs.',
      yearsExperience: '12',
      availability: 'BUSY',
      communeId: 1,
      professionalPhone: '',
    });
    const { error } = await karim
      .from('artisan_profiles')
      .update({ description: values.description, availability: values.availability })
      .eq('user_id', KARIM);
    expect(error).toBeNull();
  });

  it('un profil publié ne peut pas perdre sa description (contrôle serveur)', async () => {
    const karim = await signedIn('karim@khedma.test');
    const { error } = await karim
      .from('artisan_profiles')
      .update({ description: 'Trop court' })
      .eq('user_id', KARIM);
    expect(error?.hint).toBe('publish_description');
  });

  it('un profil publié ne peut pas perdre toutes ses zones (contrôle serveur)', async () => {
    const karim = await signedIn('karim@khedma.test');
    const before = await karim
      .from('artisan_service_areas')
      .select('commune_id')
      .eq('artisan_id', KARIM);
    const { error } = await karim.from('artisan_service_areas').delete().eq('artisan_id', KARIM);
    expect(error?.hint).toBe('last_zone');
    const after = await karim
      .from('artisan_service_areas')
      .select('commune_id')
      .eq('artisan_id', KARIM);
    expect(after.data).toHaveLength(before.data?.length ?? -1);
  });

  it('le statut de vérification n’est jamais modifiable par l’artisan', async () => {
    const karim = await signedIn('karim@khedma.test');
    const { error } = await karim
      .from('artisan_profiles')
      .update({ verification_status: 'VERIFIED' })
      .eq('user_id', KARIM);
    expect(error?.code).toBe('42501');
  });
});

describe('téléphone professionnel', () => {
  it('l’artisan relit son numéro ; un autre utilisateur ne peut pas le lire', async () => {
    const karim = await signedIn('karim@khedma.test');
    const own = await karim.rpc('get_my_professional_phone');
    expect(own.error).toBeNull();

    const amina = await signedIn('amina@khedma.test');
    const other = await amina
      .from('artisan_profiles')
      .select('professional_phone')
      .eq('user_id', KARIM);
    expect(other.error?.code).toBe('42501');
    const publicPart = await amina
      .from('artisan_profiles')
      .select('business_name')
      .eq('user_id', KARIM)
      .single();
    expect(publicPart.data?.business_name).toBe('Karim Plomberie');
  });
});

describe('galerie (bucket portfolio)', () => {
  it('ajout d’une réalisation sans légende, image publique identique, réorganisation, suppression', async () => {
    const karim = await signedIn('karim@khedma.test');
    const item = await karim
      .from('portfolio_items')
      .insert({ artisan_id: KARIM, title: null, sort_order: 0 })
      .select('id')
      .single();
    expect(item.error).toBeNull();
    const itemId = item.data?.id as string;
    const path = `${KARIM}/${itemId}/${Date.now()}.jpg`;
    cleanups.push(async () => {
      const k = await signedIn('karim@khedma.test');
      await k.from('portfolio_items').delete().eq('id', itemId);
      await k.storage.from('portfolio').remove([path]);
    });

    const upload = await karim.storage
      .from('portfolio')
      .upload(path, body(), { contentType: 'image/jpeg', upsert: false });
    expect(upload.error).toBeNull();
    const image = await karim
      .from('portfolio_images')
      .insert({ item_id: itemId, storage_path: path });
    expect(image.error).toBeNull();

    const response = await fetch(karim.storage.from('portfolio').getPublicUrl(path).data.publicUrl);
    expect(response.status).toBe(200);
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(TINY_JPEG));

    const reorder = await karim.rpc('reorder_my_portfolio', { p_item_ids: [itemId] });
    expect(reorder.error).toBeNull();

    const removed = await karim.from('portfolio_items').delete().eq('id', itemId);
    expect(removed.error).toBeNull();
    const file = await karim.storage.from('portfolio').remove([path]);
    expect(file.error).toBeNull();
  });

  it('un utilisateur sans rôle artisan ne peut rien déposer dans la galerie', async () => {
    const amina = await signedIn('amina@khedma.test');
    const { error } = await amina.storage
      .from('portfolio')
      .upload(`11111111-1111-4111-8111-111111111111/x/${Date.now()}.jpg`, body(), {
        contentType: 'image/jpeg',
      });
    expect(error).not.toBeNull();
  });

  it('un artisan ne peut pas déposer dans le dossier d’un autre artisan', async () => {
    const yacine = await signedIn('yacine@khedma.test');
    const { error } = await yacine.storage
      .from('portfolio')
      .upload(`${KARIM}/intrusion/${Date.now()}.jpg`, body(), { contentType: 'image/jpeg' });
    expect(error).not.toBeNull();
  });
});
