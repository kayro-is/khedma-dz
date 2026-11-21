import { describe, expect, it } from 'vitest';

import { assertPublicSupabaseKey, checkPublicSupabaseKey } from './supabaseKey';

// Clés FICTIVES construites pour le test (aucune clé réelle).
const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url')}.signature`;

describe('checkPublicSupabaseKey', () => {
  it('accepte une publishable key', () => {
    expect(checkPublicSupabaseKey('sb_publishable_abc123')).toEqual({ ok: true });
  });

  it('accepte une ancienne clé anon (JWT role=anon)', () => {
    expect(checkPublicSupabaseKey(jwt('anon'))).toEqual({ ok: true });
  });

  it('refuse une secret key', () => {
    expect(checkPublicSupabaseKey('sb_secret_abc123')).toEqual({ ok: false, reason: 'secret' });
  });

  it('refuse une clé service_role (JWT)', () => {
    expect(checkPublicSupabaseKey(jwt('service_role'))).toEqual({ ok: false, reason: 'secret' });
  });

  it.each(['', 'n-importe-quoi', 'a.b.c'])('refuse une valeur non reconnue (%j)', (key) => {
    expect(checkPublicSupabaseKey(key).ok).toBe(false);
  });
});

describe('assertPublicSupabaseKey', () => {
  it("n'inclut jamais la clé dans le message d'erreur", () => {
    const secret = 'sb_secret_NE_DOIT_PAS_APPARAITRE';
    expect(() => assertPublicSupabaseKey(secret, 'EXPO_PUBLIC_SUPABASE_ANON_KEY')).toThrow(
      /SECRÈTE/,
    );
    try {
      assertPublicSupabaseKey(secret, 'X');
    } catch (error) {
      expect(String(error)).not.toContain('NE_DOIT_PAS_APPARAITRE');
    }
  });
});
