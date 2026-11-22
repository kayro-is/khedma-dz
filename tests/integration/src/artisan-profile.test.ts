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
  it('ajout d’une réalisation sans légende, accès par URL signée uniquement, réorganisation, suppression', async () => {
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

    // Bucket privé : l'URL publique ne donne plus accès à l'image.
    const publicUrl = karim.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
    expect((await fetch(publicUrl)).status).not.toBe(200);

    // URL signée de l'artisan : contenu exact.
    const signed = await karim.storage.from('portfolio').createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const response = await fetch(signed.data?.signedUrl as string);
    expect(response.status).toBe(200);
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(TINY_JPEG));

    const reorder = await karim.rpc('reorder_my_portfolio', { p_item_ids: [itemId] });
    expect(reorder.error).toBeNull();

    const removed = await karim.from('portfolio_items').delete().eq('id', itemId);
    expect(removed.error).toBeNull();
    const file = await karim.storage.from('portfolio').remove([path]);
    expect(file.error).toBeNull();
  });

  it('accès selon la publication : client autorisé si publié, refusé après dépublication ; URL qui expire', async () => {
    const karim = await signedIn('karim@khedma.test');
    const amina = await signedIn('amina@khedma.test');
    const yacine = await signedIn('yacine@khedma.test');
    const item = await karim
      .from('portfolio_items')
      .insert({ artisan_id: KARIM, title: 'Test confidentialité', sort_order: 0 })
      .select('id')
      .single();
    const itemId = item.data?.id as string;
    const path = `${KARIM}/${itemId}/${Date.now()}.jpg`;
    // Nettoyage garanti : republication de Karim, suppression de la réalisation et du fichier.
    cleanups.push(async () => {
      const k = await signedIn('karim@khedma.test');
      await k.from('artisan_profiles').update({ is_published: true }).eq('user_id', KARIM);
      await k.from('portfolio_items').delete().eq('id', itemId);
      await k.storage.from('portfolio').remove([path]);
    });
    expect(
      (await karim.storage.from('portfolio').upload(path, body(), { contentType: 'image/jpeg' }))
        .error,
    ).toBeNull();
    expect(
      (await karim.from('portfolio_images').insert({ item_id: itemId, storage_path: path })).error,
    ).toBeNull();

    // Profil publié : un client obtient un accès.
    const client = await amina.storage.from('portfolio').createSignedUrl(path, 60);
    expect(client.error).toBeNull();
    expect((await fetch(client.data?.signedUrl as string)).status).toBe(200);

    // Un client ne peut pas supprimer la photo d'un artisan.
    await amina.storage.from('portfolio').remove([path]);
    expect((await karim.storage.from('portfolio').createSignedUrl(path, 60)).error).toBeNull();

    // URL signée de courte durée : refusée après expiration.
    const short = await karim.storage.from('portfolio').createSignedUrl(path, 2);
    expect((await fetch(short.data?.signedUrl as string)).status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    expect((await fetch(short.data?.signedUrl as string)).status).not.toBe(200);

    // Dépublication : plus aucun nouvel accès pour les autres ; l'artisan garde l'accès.
    expect(
      (await karim.from('artisan_profiles').update({ is_published: false }).eq('user_id', KARIM))
        .error,
    ).toBeNull();
    expect((await amina.storage.from('portfolio').createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await yacine.storage.from('portfolio').createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await karim.storage.from('portfolio').createSignedUrl(path, 60)).error).toBeNull();

    // Republication : rien n'a été perdu, l'accès revient.
    expect(
      (await karim.from('artisan_profiles').update({ is_published: true }).eq('user_id', KARIM))
        .error,
    ).toBeNull();
    expect((await amina.storage.from('portfolio').createSignedUrl(path, 60)).error).toBeNull();
  }, 20_000);

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
