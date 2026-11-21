import { describe, expect, it, vi } from 'vitest';

// `env.ts` lit process.env à l'import : on fournit des valeurs valides pour pouvoir tester parsePublicEnv.
vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test');

const { parsePublicEnv } = await import('./env');

describe('parsePublicEnv', () => {
  it('accepte une URL HTTPS', () => {
    expect(
      parsePublicEnv({
        supabaseUrl: 'https://abc.supabase.co/',
        supabaseAnonKey: 'sb_publishable_k',
      }),
    ).toEqual({
      supabaseUrl: 'https://abc.supabase.co',
      supabaseAnonKey: 'sb_publishable_k',
    });
  });

  it.each(['http://127.0.0.1:54321', 'http://192.168.1.20:54321', 'http://10.0.2.2:54321'])(
    'accepte HTTP en réseau local (%s)',
    (supabaseUrl) => {
      expect(() =>
        parsePublicEnv({ supabaseUrl, supabaseAnonKey: 'sb_publishable_k' }),
      ).not.toThrow();
    },
  );

  it('refuse HTTP sur Internet', () => {
    expect(() =>
      parsePublicEnv({ supabaseUrl: 'http://exemple.dz', supabaseAnonKey: 'sb_publishable_k' }),
    ).toThrow(/HTTPS/);
  });

  it('signale les variables manquantes', () => {
    expect(() => parsePublicEnv({ supabaseUrl: undefined, supabaseAnonKey: '' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it('refuse une URL invalide', () => {
    expect(() =>
      parsePublicEnv({ supabaseUrl: 'pas une url', supabaseAnonKey: 'sb_publishable_k' }),
    ).toThrow(/URL valide/);
  });
});

describe('garde-fou clé secrète', () => {
  it('refuse de démarrer avec une clé secrète', () => {
    expect(() =>
      parsePublicEnv({ supabaseUrl: 'https://abc.supabase.co', supabaseAnonKey: 'sb_secret_x' }),
    ).toThrow(/SECRÈTE/);
  });
});
