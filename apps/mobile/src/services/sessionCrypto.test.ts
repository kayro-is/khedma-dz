import { describe, expect, it } from 'vitest';

import {
  base64ToBytes,
  bytesToBase64,
  decryptValue,
  encryptValue,
  secureStoreKeyName,
} from './sessionCrypto';

const key = () => globalThis.crypto.getRandomValues(new Uint8Array(32));
const nonce = () => globalThis.crypto.getRandomValues(new Uint8Array(12));
// Session fictive, volumineuse comme une vraie (jetons JWT + profil) et avec de l'arabe.
const session = JSON.stringify({
  access_token: 'x'.repeat(1200),
  refresh_token: 'r'.repeat(40),
  user: { email: 'amina@khedma.test', user_metadata: { first_name: 'أمينة' } },
});

describe('sessionCrypto', () => {
  it('chiffre puis déchiffre à l’identique (y compris UTF-8 arabe)', () => {
    const k = key();
    expect(decryptValue(encryptValue(session, k, nonce()), k)).toBe(session);
  });

  it('ne laisse rien apparaître en clair', () => {
    const encrypted = encryptValue(session, key(), nonce());
    expect(encrypted).not.toContain('amina');
    expect(atob(encrypted)).not.toContain('access_token');
  });

  it('deux chiffrements du même texte diffèrent (nonce aléatoire)', () => {
    const k = key();
    expect(encryptValue('a', k, nonce())).not.toBe(encryptValue('a', k, nonce()));
  });

  it('refuse une mauvaise clé', () => {
    const encrypted = encryptValue(session, key(), nonce());
    expect(() => decryptValue(encrypted, key())).toThrow();
  });

  it('détecte toute modification des données (authentification GCM)', () => {
    const k = key();
    const bytes = base64ToBytes(encryptValue(session, k, nonce()));
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff;
    expect(() => decryptValue(bytesToBase64(bytes), k)).toThrow();
  });

  it('rejette des longueurs de clé ou de nonce invalides', () => {
    expect(() => encryptValue('a', new Uint8Array(16), nonce())).toThrow('invalid_key_length');
    expect(() => encryptValue('a', key(), new Uint8Array(8))).toThrow('invalid_nonce_length');
  });

  it('produit un nom de clé SecureStore valide', () => {
    expect(secureStoreKeyName('sb-abc-auth-token-code-verifier')).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(secureStoreKeyName('a/b:c')).toBe('khedma.session-key.a_b_c');
  });
});
