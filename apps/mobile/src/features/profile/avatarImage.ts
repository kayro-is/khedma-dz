/**
 * Données binaires de la photo de profil — logique pure, testée.
 *
 * L'image compressée est obtenue directement en Base64 auprès d'expo-image-manipulator, puis
 * décodée ici : on ne relit jamais le fichier local avec fetch(), qui sur Android a renvoyé un
 * texte d'erreur (« File not found ») envoyé tel quel comme JPEG (bug corrigé). Les octets sont
 * vérifiés avant tout envoi : un contenu qui n'est pas un JPEG n'atteint jamais le Storage.
 */

/** Limite du bucket « avatars » (2 Mo, voir la migration storage). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Map([...ALPHABET].map((char, index) => [char, index]));

/** Décode du Base64 (avec ou sans préfixe data:, retours à la ligne et remplissage tolérés). */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/^data:[^,]*,/, '').replace(/[\s=]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let length = 0;
  for (const char of clean) {
    const value = LOOKUP.get(char);
    if (value === undefined) throw new Error('base64_invalid');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[length++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, length);
}

export type AvatarBytesProblem = 'empty' | 'notJpeg' | 'tooLarge';

/** Vérifie qu'il s'agit bien d'un JPEG (signature FF D8 FF) dans la limite indiquée. */
export function checkJpegBytes(bytes: Uint8Array, maxBytes: number): AvatarBytesProblem | null {
  if (bytes.length === 0) return 'empty';
  if (bytes.length > maxBytes) return 'tooLarge';
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return 'notJpeg';
  }
  return null;
}

/** Photo de profil : JPEG dans la limite du bucket « avatars ». */
export const checkAvatarBytes = (bytes: Uint8Array) => checkJpegBytes(bytes, AVATAR_MAX_BYTES);

/** ArrayBuffer exactement limité aux octets de l'image (corps d'envoi accepté par React Native). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Erreur levée avant l'envoi si l'image préparée est inutilisable. */
export class AvatarImageError extends Error {
  constructor(readonly problem: AvatarBytesProblem | 'unreadable') {
    super(`avatar_${problem}`);
    this.name = 'AvatarImageError';
  }
}
