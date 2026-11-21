/**
 * Accès aux données du profil artisan : Supabase simulé (aucun réseau). Vérifie l'ordre des
 * opérations, le nettoyage en cas d'échec et ce qui est réellement envoyé.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { base64ToBytes } from '@/features/profile/avatarImage';

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
const calls: Call[] = [];
let failOn: { table: string; op: string } | null = null;

function builder(table: string) {
  const call: Call = { table, op: '', filters: [] };
  const result = () =>
    failOn && failOn.table === table && failOn.op === call.op
      ? { data: null, error: { code: 'XX000', message: 'échec simulé' } }
      : { data: call.op === 'insert' ? { id: 'item-1' } : null, error: null };
  const chain = {
    insert: (payload: unknown) => (
      (call.op = 'insert'),
      (call.payload = payload),
      calls.push(call),
      chain
    ),
    update: (payload: unknown) => (
      (call.op = 'update'),
      (call.payload = payload),
      calls.push(call),
      chain
    ),
    upsert: (payload: unknown) => (
      (call.op = 'upsert'),
      (call.payload = payload),
      calls.push(call),
      chain
    ),
    delete: () => ((call.op = 'delete'), calls.push(call), chain),
    eq: (col: string, value: unknown) => (call.filters.push([col, value]), chain),
    in: (col: string, value: unknown) => (call.filters.push([col, value]), chain),
    select: () => chain,
    single: async () => result(),
    then: (resolve: (value: unknown) => unknown) => resolve(result()),
  };
  return chain;
}

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: unknown) => {
      calls.push({ table: `rpc:${fn}`, op: 'rpc', payload: args, filters: [] });
      return { data: null, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: unknown) => {
          calls.push({
            table: `storage:${bucket}`,
            op: 'upload',
            payload: { path, body },
            filters: [],
          });
          return failOn?.op === 'upload'
            ? { data: null, error: { message: 'échec envoi' } }
            : { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          calls.push({ table: `storage:${bucket}`, op: 'remove', payload: paths, filters: [] });
          return { data: [], error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://test/${path}` } }),
      }),
    },
  },
}));

const api = await import('./proProfileApi');
const { fitWithin } = await import('./proProfileLogic');

const USER = '11111111-1111-4111-8111-111111111111';
const JPEG = base64ToBytes(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
);
const ops = () => calls.map((c) => `${c.table}.${c.op}`);

beforeEach(() => {
  calls.length = 0;
  failOn = null;
});

describe('updateProInfo', () => {
  it('n’envoie que les colonnes autorisées et ajoute la commune de rattachement aux zones', async () => {
    await api.updateProInfo(USER, {
      businessName: 'Karim Plomberie',
      description: null,
      yearsExperience: 12,
      availability: 'BUSY',
      communeId: 1628,
      professionalPhone: '+213555123456',
    });
    expect(ops()).toEqual(['artisan_profiles.update', 'artisan_service_areas.upsert']);
    const payload = calls[0]?.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual([
      'availability',
      'base_commune_id',
      'business_name',
      'description',
      'professional_phone',
      'years_experience',
    ]);
    expect(payload).not.toHaveProperty('verification_status');
    expect(payload).not.toHaveProperty('is_published');
  });
});

describe('saveTrades', () => {
  it('principal d’abord, puis retraits, puis ajouts', async () => {
    await api.saveTrades(
      USER,
      { primaryCategoryId: 'A', serviceIds: ['A', 'B'] },
      { primaryCategoryId: 'C', secondaryCategoryIds: ['D'] },
    );
    expect(ops()).toEqual([
      'artisan_profiles.update',
      'artisan_services.delete',
      'artisan_services.insert',
    ]);
    expect(calls[1]?.filters).toContainEqual(['category_id', ['A', 'B']]);
  });
});

describe('saveZones', () => {
  it('ajoute avant de retirer', async () => {
    await api.saveZones(USER, [1, 2], [2, 3]);
    expect(ops()).toEqual(['artisan_service_areas.insert', 'artisan_service_areas.delete']);
  });

  it('s’arrête à la première erreur (aucune suppression après un ajout refusé)', async () => {
    failOn = { table: 'artisan_service_areas', op: 'insert' };
    await expect(api.saveZones(USER, [1], [2])).rejects.toMatchObject({ code: 'XX000' });
    expect(ops()).toEqual(['artisan_service_areas.insert']);
  });
});

describe('galerie', () => {
  it('ajout : réalisation, envoi des octets exacts dans le dossier de l’artisan, puis rattachement', async () => {
    await api.addPortfolioPhoto(USER, { bytes: JPEG, caption: 'Cuisine' }, 3);
    expect(ops()).toEqual([
      'portfolio_items.insert',
      'storage:portfolio.upload',
      'portfolio_images.insert',
    ]);
    expect(calls[0]?.payload).toEqual({ artisan_id: USER, title: 'Cuisine', sort_order: 3 });
    const upload = calls[1]?.payload as { path: string; body: ArrayBuffer };
    expect(upload.path).toMatch(new RegExp(`^${USER}/item-1/\\d+\\.jpg$`));
    expect(Array.from(new Uint8Array(upload.body))).toEqual(Array.from(JPEG));
  });

  it('RÉGRESSION Android : refuse un contenu qui n’est pas un JPEG, sans rien créer', async () => {
    await expect(
      api.addPortfolioPhoto(
        USER,
        { bytes: new TextEncoder().encode('File not found'), caption: null },
        0,
      ),
    ).rejects.toThrow('avatar_notJpeg');
    expect(calls).toEqual([]);
  });

  it('envoi échoué : la réalisation créée est retirée', async () => {
    failOn = { table: 'storage:portfolio', op: 'upload' };
    await expect(
      api.addPortfolioPhoto(USER, { bytes: JPEG, caption: null }, 0),
    ).rejects.toBeTruthy();
    expect(ops()).toEqual([
      'portfolio_items.insert',
      'storage:portfolio.upload',
      'portfolio_items.delete',
    ]);
  });

  it('rattachement échoué : réalisation puis fichier retirés', async () => {
    failOn = { table: 'portfolio_images', op: 'insert' };
    await expect(
      api.addPortfolioPhoto(USER, { bytes: JPEG, caption: null }, 0),
    ).rejects.toBeTruthy();
    expect(ops()).toEqual([
      'portfolio_items.insert',
      'storage:portfolio.upload',
      'portfolio_images.insert',
      'portfolio_items.delete',
      'storage:portfolio.remove',
    ]);
  });

  it('suppression : données d’abord, fichier ensuite, jamais hors de son dossier', async () => {
    await api.deletePortfolioItem(USER, {
      id: 'i1',
      caption: null,
      sortOrder: 0,
      imagePath: `${USER}/i1/1.jpg`,
      imageUrl: null,
    });
    expect(ops()).toEqual(['portfolio_items.delete', 'storage:portfolio.remove']);
    calls.length = 0;
    await api.deletePortfolioItem(USER, {
      id: 'i2',
      caption: null,
      sortOrder: 0,
      imagePath: '22222222-2222-4222-8222-222222222222/i2/1.jpg',
      imageUrl: null,
    });
    expect(ops()).toEqual(['portfolio_items.delete']);
  });

  it('suppression refusée : le fichier n’est pas touché', async () => {
    failOn = { table: 'portfolio_items', op: 'delete' };
    await expect(
      api.deletePortfolioItem(USER, {
        id: 'i1',
        caption: null,
        sortOrder: 0,
        imagePath: `${USER}/i1/1.jpg`,
        imageUrl: null,
      }),
    ).rejects.toBeTruthy();
    expect(ops()).toEqual(['portfolio_items.delete']);
  });

  it('réorganisation en un seul appel serveur', async () => {
    await api.reorderPortfolio(['b', 'a']);
    expect(calls[0]).toMatchObject({
      table: 'rpc:reorder_my_portfolio',
      payload: { p_item_ids: ['b', 'a'] },
    });
  });
});

describe('fitWithin (redimensionnement des photos de réalisation)', () => {
  it.each([
    [4000, 3000, { width: 1600, height: 1200 }],
    [3000, 4000, { width: 1200, height: 1600 }],
    [800, 600, { width: 800, height: 600 }],
  ])('%i×%i → %j', (w, h, expected) => {
    expect(fitWithin(w, h)).toEqual(expected);
  });
});
