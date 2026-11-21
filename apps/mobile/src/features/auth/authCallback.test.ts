import { describe, expect, it } from 'vitest';

import { parseAuthCallback } from './authCallback';

const CODE = '4f1c2a7e-0b5d-4c8e-9a3f-6d2b1e0c9a77';

describe('parseAuthCallback', () => {
  it('lien de confirmation (application installée)', () => {
    expect(parseAuthCallback(`khedmadz://auth-callback?code=${CODE}`)).toEqual({
      kind: 'code',
      code: CODE,
      next: 'home',
    });
  });

  it('lien de réinitialisation via Expo Go', () => {
    expect(
      parseAuthCallback(
        `exp://192.168.1.20:8081/--/auth-callback?next=reset-password&code=${CODE}`,
      ),
    ).toEqual({ kind: 'code', code: CODE, next: 'reset-password' });
  });

  it('erreur Supabase dans le fragment (lien expiré)', () => {
    expect(
      parseAuthCallback(
        'khedmadz://auth-callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
      ),
    ).toEqual({ kind: 'error', errorCode: 'otp_expired' });
  });

  it('utilise les paramètres de route si l’URL complète est indisponible', () => {
    expect(parseAuthCallback(null, { code: CODE, next: 'reset-password' })).toEqual({
      kind: 'code',
      code: CODE,
      next: 'reset-password',
    });
  });

  it('ignore une destination inconnue (pas de redirection arbitraire)', () => {
    const result = parseAuthCallback(
      `khedmadz://auth-callback?code=${CODE}&next=https://pirate.example`,
    );
    expect(result).toEqual({ kind: 'code', code: CODE, next: 'home' });
  });

  it('rejette un code mal formé', () => {
    expect(parseAuthCallback('khedmadz://auth-callback?code=<script>')).toEqual({ kind: 'empty' });
  });

  it('lien vide', () => {
    expect(parseAuthCallback('khedmadz://auth-callback')).toEqual({ kind: 'empty' });
  });
});
