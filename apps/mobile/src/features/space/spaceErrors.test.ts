import { describe, expect, it } from 'vitest';

import ar from '@/i18n/locales/ar.json';
import fr from '@/i18n/locales/fr.json';

import { SPACE_ERROR_KEYS, isAlreadyArtisanError, spaceErrorKey } from './spaceErrors';

describe('spaceErrorKey', () => {
  it.each([
    [{ code: '42501', message: 'new row violates row-level security policy' }, 'notAllowed'],
    [{ code: '23503', message: 'violates foreign key constraint' }, 'invalidSelection'],
    [{ code: '23514', message: 'violates check constraint' }, 'invalidSelection'],
    [{ code: 'PGRST301', message: 'JWT expired' }, 'sessionExpired'],
    [new TypeError('Network request failed'), 'network'],
    [{ code: 'XX000', message: 'boom' }, 'activationFailed'],
    [null, 'activationFailed'],
  ])('%j → %s', (error, expected) => {
    expect(spaceErrorKey(error)).toBe(expected);
  });

  it('reconnaît un profil artisan déjà existant (activation déjà faite)', () => {
    expect(isAlreadyArtisanError({ code: '23505' })).toBe(true);
    expect(isAlreadyArtisanError({ code: '42501' })).toBe(false);
    expect(isAlreadyArtisanError(null)).toBe(false);
  });
});

describe('traductions des erreurs d’espace', () => {
  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('toutes les erreurs sont traduites en %s', (_, dict) => {
    const errors = (dict as { space: { errors: Record<string, string> } }).space.errors;
    for (const key of SPACE_ERROR_KEYS) expect(errors[key], key).toBeTruthy();
  });
});
