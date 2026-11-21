import { describe, expect, it } from 'vitest';

import { AVATAR_MAX_BYTES, base64ToBytes, checkAvatarBytes, toArrayBuffer } from './avatarImage';

// JPEG 1×1 valide.
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

// Décodage de référence de la plateforme (atob), pour comparaison.
const reference = (b64: string) => Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));

describe('base64ToBytes', () => {
  it('décode exactement comme la plateforme (image JPEG)', () => {
    expect(Array.from(base64ToBytes(TINY_JPEG_B64))).toEqual(Array.from(reference(TINY_JPEG_B64)));
  });

  it.each(['', 'QQ==', 'QUI=', 'QUJD', 'AAECAwQFBgcICQ=='])(
    'décode « %s » sans erreur de longueur',
    (b64) => {
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(reference(b64)));
    },
  );

  it('tolère un préfixe data: et des retours à la ligne', () => {
    const withPrefix = `data:image/jpeg;base64,${TINY_JPEG_B64.slice(0, 40)}\n${TINY_JPEG_B64.slice(40)}`;
    expect(base64ToBytes(withPrefix)).toEqual(base64ToBytes(TINY_JPEG_B64));
  });

  it('refuse un contenu qui n’est pas du Base64', () => {
    expect(() => base64ToBytes('pas du base64 !')).toThrow('base64_invalid');
  });
});

describe('checkAvatarBytes', () => {
  it('accepte un JPEG valide', () => {
    expect(checkAvatarBytes(base64ToBytes(TINY_JPEG_B64))).toBeNull();
  });

  it('RÉGRESSION : refuse le texte « File not found » envoyé à la place de la photo', () => {
    expect(checkAvatarBytes(new TextEncoder().encode('File not found'))).toBe('notJpeg');
  });

  it.each([
    [new Uint8Array(0), 'empty'],
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]), 'notJpeg'], // PNG
    [new Uint8Array([0xff, 0xd8]), 'notJpeg'],
    [new Uint8Array(AVATAR_MAX_BYTES + 1).fill(0xff), 'tooLarge'],
  ])('%#: refusé (%s)', (bytes, problem) => {
    expect(checkAvatarBytes(bytes)).toBe(problem);
  });
});

describe('toArrayBuffer', () => {
  it('ne contient que les octets de la vue, pas tout le tampon sous-jacent', () => {
    const view = new Uint8Array([1, 2, 3, 4, 5]).subarray(1, 4);
    expect(Array.from(new Uint8Array(toArrayBuffer(view)))).toEqual([2, 3, 4]);
  });
});
