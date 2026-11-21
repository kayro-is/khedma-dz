import { describe, expect, it } from 'vitest';

import ar from '@/i18n/locales/ar.json';
import fr from '@/i18n/locales/fr.json';

import {
  PROFILE_ERROR_KEYS,
  buildAvatarPath,
  isOwnAvatarPath,
  profileErrorKey,
} from './profileErrors';

const USER = '11111111-1111-4111-8111-111111111111';

describe('profileErrorKey', () => {
  it.each([
    [
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "profile_private_phone_key"',
      },
      'phoneTaken',
    ],
    [{ code: 'P0001', message: 'active_jobs', hint: 'active_jobs' }, 'activeJobs'],
    [{ code: 'PGRST301', message: 'JWT expired' }, 'sessionExpired'],
    [{ code: 'invalid_credentials', status: 400 }, 'wrongCurrentPassword'],
    [new TypeError('Network request failed'), 'network'],
    [{ code: '42501', message: 'permission denied' }, 'saveFailed'],
    [null, 'saveFailed'],
  ])('%j → %s', (error, expected) => {
    expect(profileErrorKey(error)).toBe(expected);
  });

  it('utilise la valeur par défaut fournie', () => {
    expect(profileErrorKey({ message: 'storage' }, 'photoFailed')).toBe('photoFailed');
  });
});

describe('chemins d’avatar', () => {
  it('place l’avatar dans le dossier de l’utilisateur avec un nom unique', () => {
    expect(buildAvatarPath(USER, 1700000000000)).toBe(`${USER}/avatar-1700000000000.jpg`);
  });

  it.each([
    [`${USER}/avatar-1.jpg`, true],
    ['22222222-2222-4222-8222-222222222222/avatar-1.jpg', false],
    [`${USER}/../autre/avatar.jpg`, false],
    [null, false],
  ])('%j appartient à l’utilisateur : %s', (path, expected) => {
    expect(isOwnAvatarPath(USER, path)).toBe(expected);
  });
});

describe('traductions des erreurs de profil', () => {
  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('toutes les erreurs sont traduites en %s', (_, dict) => {
    const errors = (dict as { profile: { errors: Record<string, string> } }).profile.errors;
    for (const key of PROFILE_ERROR_KEYS) expect(errors[key], key).toBeTruthy();
  });
});
