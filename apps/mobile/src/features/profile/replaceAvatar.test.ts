/**
 * Envoi de la photo de profil : Supabase est simulé (aucun réseau). Vérifie ce qui est
 * réellement transmis au Storage et l'ordre des opérations.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { base64ToBytes } from './avatarImage';

const calls: { op: string; args: unknown[] }[] = [];
let updateError: unknown = null;

vi.mock('@/services/supabase', () => {
  const bucket = {
    upload: vi.fn(async (...args: unknown[]) => {
      calls.push({ op: 'upload', args });
      return { data: { path: args[0] }, error: null };
    }),
    remove: vi.fn(async (...args: unknown[]) => {
      calls.push({ op: 'remove', args });
      return { data: [], error: null };
    }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://test/avatars/${path}` } }),
  };
  return {
    supabase: {
      storage: { from: () => bucket },
      from: () => ({
        update: (values: unknown) => ({
          eq: async () => {
            calls.push({ op: 'update', args: [values] });
            return { error: updateError };
          },
        }),
      }),
    },
  };
});

const { replaceAvatar } = await import('./profileApi');

const USER = '11111111-1111-4111-8111-111111111111';
const JPEG = base64ToBytes(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
);

beforeEach(() => {
  calls.length = 0;
  updateError = null;
});

describe('replaceAvatar', () => {
  it('envoie les octets JPEG exacts (ArrayBuffer, image/jpeg) dans le dossier de l’utilisateur', async () => {
    const path = await replaceAvatar(USER, null, JPEG);
    const upload = calls.find((c) => c.op === 'upload');
    expect(path).toMatch(new RegExp(`^${USER}/avatar-\\d+\\.jpg$`));
    expect(upload?.args[0]).toBe(path);
    const body = upload?.args[1] as ArrayBuffer;
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(body))).toEqual(Array.from(JPEG));
    expect(upload?.args[2]).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect(calls.find((c) => c.op === 'update')?.args[0]).toEqual({ avatar_path: path });
  });

  it('RÉGRESSION : n’envoie jamais un contenu qui n’est pas un JPEG', async () => {
    await expect(
      replaceAvatar(USER, null, new TextEncoder().encode('File not found')),
    ).rejects.toThrow('avatar_notJpeg');
    expect(calls).toEqual([]);
  });

  it('supprime l’ancienne photo seulement après la mise à jour du profil', async () => {
    await replaceAvatar(USER, `${USER}/avatar-1.jpg`, JPEG);
    expect(calls.map((c) => c.op)).toEqual(['upload', 'update', 'remove']);
    expect(calls[2]?.args[0]).toEqual([`${USER}/avatar-1.jpg`]);
  });

  it('ne supprime jamais un fichier hors du dossier de l’utilisateur', async () => {
    await replaceAvatar(USER, '22222222-2222-4222-8222-222222222222/avatar-1.jpg', JPEG);
    expect(calls.map((c) => c.op)).toEqual(['upload', 'update']);
  });

  it('retire le nouveau fichier si le profil ne peut pas être mis à jour', async () => {
    updateError = { code: '42501', message: 'permission denied' };
    await expect(replaceAvatar(USER, null, JPEG)).rejects.toEqual(updateError);
    expect(calls.map((c) => c.op)).toEqual(['upload', 'update', 'remove']);
  });
});
