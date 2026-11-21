import type { Session } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { authReducer, initialAuthState, resolveEntryRoute, type AuthState } from './authState';

const session = { access_token: 'a', user: { id: 'u' } } as unknown as Session;
const signedIn: AuthState = { ...initialAuthState, status: 'signedIn', session };

describe('authReducer', () => {
  it('session initiale présente → connecté', () => {
    const state = authReducer(initialAuthState, {
      type: 'auth-event',
      event: 'INITIAL_SESSION',
      session,
      manualSignOut: false,
    });
    expect(state.status).toBe('signedIn');
  });

  it('aucune session au démarrage → déconnecté, sans message', () => {
    const state = authReducer(initialAuthState, {
      type: 'auth-event',
      event: 'INITIAL_SESSION',
      session: null,
      manualSignOut: false,
    });
    expect(state).toMatchObject({ status: 'signedOut', signOutReason: null });
  });

  it('déconnexion volontaire', () => {
    const state = authReducer(signedIn, {
      type: 'auth-event',
      event: 'SIGNED_OUT',
      session: null,
      manualSignOut: true,
    });
    expect(state).toMatchObject({ status: 'signedOut', signOutReason: 'manual' });
  });

  it('déconnexion subie (jeton expiré ou révoqué) → motif « expired »', () => {
    const state = authReducer(signedIn, {
      type: 'auth-event',
      event: 'SIGNED_OUT',
      session: null,
      manualSignOut: false,
    });
    expect(state).toMatchObject({ status: 'signedOut', signOutReason: 'expired', session: null });
  });

  it('renouvellement du jeton → reste connecté avec la nouvelle session', () => {
    const renewed = { ...session, access_token: 'b' } as Session;
    const state = authReducer(signedIn, {
      type: 'auth-event',
      event: 'TOKEN_REFRESHED',
      session: renewed,
      manualSignOut: false,
    });
    expect(state.session?.access_token).toBe('b');
  });

  it('lien de récupération → mode « nouveau mot de passe », jusqu’à validation', () => {
    const recovering = authReducer(initialAuthState, {
      type: 'auth-event',
      event: 'PASSWORD_RECOVERY',
      session,
      manualSignOut: false,
    });
    expect(recovering.passwordRecovery).toBe(true);
    const updated = authReducer(recovering, {
      type: 'auth-event',
      event: 'USER_UPDATED',
      session,
      manualSignOut: false,
    });
    expect(updated.passwordRecovery).toBe(true);
    expect(authReducer(updated, { type: 'recovery-completed' }).passwordRecovery).toBe(false);
  });

  it('le message d’expiration disparaît une fois affiché', () => {
    const expired: AuthState = {
      ...initialAuthState,
      status: 'signedOut',
      signOutReason: 'expired',
    };
    expect(authReducer(expired, { type: 'reason-acknowledged' }).signOutReason).toBeNull();
  });
});

describe('resolveEntryRoute', () => {
  it.each([
    [{ hasChosenLocale: false, status: 'signedIn', passwordRecovery: false }, '/language'],
    [{ hasChosenLocale: true, status: 'signedOut', passwordRecovery: false }, null],
    [{ hasChosenLocale: true, status: 'signedIn', passwordRecovery: false }, 'space'],
    [{ hasChosenLocale: true, status: 'signedIn', passwordRecovery: true }, '/reset-password'],
  ] as const)('%j → %s', (input, expected) => {
    expect(resolveEntryRoute(input)).toBe(expected);
  });
});
