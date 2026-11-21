/**
 * Chiffrement de la session Supabase (logique pure, testée).
 * AES-256-GCM (chiffrement authentifié) via @noble/ciphers (bibliothèque auditée, 100 % JS).
 * Format stocké : base64( nonce[12] || ciphertext+tag ).
 */
import { gcm } from '@noble/ciphers/aes.js';

export const KEY_LENGTH = 32;
export const NONCE_LENGTH = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return globalThis.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encryptValue(plaintext: string, key: Uint8Array, nonce: Uint8Array): string {
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length');
  if (nonce.length !== NONCE_LENGTH) throw new Error('invalid_nonce_length');
  const ciphertext = gcm(key, nonce).encrypt(encoder.encode(plaintext));
  const payload = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  payload.set(nonce, 0);
  payload.set(ciphertext, NONCE_LENGTH);
  return bytesToBase64(payload);
}

/** Lève une erreur si la clé est fausse ou si les données ont été modifiées (tag GCM). */
export function decryptValue(payload: string, key: Uint8Array): string {
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length');
  const bytes = base64ToBytes(payload);
  if (bytes.length <= NONCE_LENGTH) throw new Error('invalid_payload');
  const nonce = bytes.subarray(0, NONCE_LENGTH);
  const ciphertext = bytes.subarray(NONCE_LENGTH);
  return decoder.decode(gcm(key, nonce).decrypt(ciphertext));
}

/** Les noms de clés SecureStore n'acceptent que [A-Za-z0-9._-]. */
export function secureStoreKeyName(storageKey: string): string {
  return `khedma.session-key.${storageKey.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
