import { afterEach, describe, expect, it } from 'vitest';

import {
  PENDING_CONFIRMATION_TTL_MS,
  clearPendingConfirmation,
  confirmationOutcome,
  pendingCredentials,
  rememberPendingConfirmation,
} from './pendingConfirmation';

afterEach(() => clearPendingConfirmation());

describe('identifiants en attente de confirmation (mémoire uniquement)', () => {
  it('disponibles pour la même adresse, quelle que soit la casse', () => {
    rememberPendingConfirmation(' Amina@Gmail.com ', 'Secret123', 0);
    expect(pendingCredentials('amina@gmail.com', 1000)).toEqual({
      email: 'amina@gmail.com',
      password: 'Secret123',
    });
  });

  it('jamais pour une autre adresse', () => {
    rememberPendingConfirmation('amina@gmail.com', 'Secret123', 0);
    expect(pendingCredentials('autre@gmail.com', 1000)).toBeNull();
  });

  it('effacés après 15 minutes', () => {
    rememberPendingConfirmation('amina@gmail.com', 'Secret123', 0);
    expect(pendingCredentials('amina@gmail.com', PENDING_CONFIRMATION_TTL_MS + 1)).toBeNull();
    expect(pendingCredentials('amina@gmail.com', 0)).toBeNull();
  });

  it('effacés sur demande (confirmation, sortie de l’écran)', () => {
    rememberPendingConfirmation('amina@gmail.com', 'Secret123', 0);
    clearPendingConfirmation();
    expect(pendingCredentials('amina@gmail.com', 0)).toBeNull();
  });
});

describe('confirmationOutcome : uniquement d’après la réponse de Supabase', () => {
  it.each([
    [{ ok: true } as const, 'confirmed'],
    [{ ok: false, error: 'emailNotConfirmed' } as const, 'notConfirmed'],
    [{ ok: false, error: 'invalidCredentials' } as const, 'needSignIn'],
    [{ ok: false, error: 'tooManyRequests' } as const, 'tooManyRequests'],
    [{ ok: false, error: 'network' } as const, 'network'],
    [{ ok: false, error: 'unknown' } as const, 'error'],
    [null, 'needSignIn'],
  ])('%j → %s', (result, expected) => {
    expect(confirmationOutcome(result)).toBe(expected);
  });

  it('SÉCURITÉ : aucun identifiant disponible n’est jamais traité comme une confirmation', () => {
    expect(confirmationOutcome(null)).not.toBe('confirmed');
  });
});
