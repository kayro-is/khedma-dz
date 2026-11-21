import { describe, expect, it } from 'vitest';

import ar from '@/i18n/locales/ar.json';
import fr from '@/i18n/locales/fr.json';

import { AUTH_ERROR_KEYS, authErrorI18nKey, authErrorKey } from './authErrors';

describe('authErrorKey', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalidCredentials'],
    [{ code: 'email_not_confirmed', status: 400 }, 'emailNotConfirmed'],
    [{ code: 'weak_password', status: 422 }, 'weakPassword'],
    [{ code: 'over_email_send_rate_limit', status: 429 }, 'emailRateLimit'],
    [{ code: 'otp_expired', status: 403 }, 'linkExpired'],
    [{ code: 'bad_code_verifier', status: 400 }, 'linkExpired'],
    [{ code: 'refresh_token_not_found', status: 400 }, 'sessionExpired'],
    [{ code: 'same_password', status: 422 }, 'samePassword'],
    [{ code: 'email_address_not_authorized', status: 400 }, 'emailNotAuthorized'],
    [{ code: 'user_banned', status: 403 }, 'accountSuspended'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' }, 'network'],
    [new TypeError('Network request failed'), 'network'],
    [{ status: 429, message: 'Too many' }, 'tooManyRequests'],
    [{ message: 'Invalid login credentials', status: 400 }, 'invalidCredentials'],
    [{ code: 'quelque_chose_de_nouveau', status: 500 }, 'unknown'],
    [null, 'unknown'],
    ['texte', 'unknown'],
  ])('%j → %s', (error, expected) => {
    expect(authErrorKey(error)).toBe(expected);
  });

  it('renvoie une clé i18n complète', () => {
    expect(authErrorI18nKey({ code: 'invalid_credentials' })).toBe(
      'auth.errors.invalidCredentials',
    );
  });
});

describe('traductions des erreurs', () => {
  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('toutes les erreurs sont traduites en %s', (_, dict) => {
    const errors = (dict as { auth: { errors: Record<string, string> } }).auth.errors;
    for (const key of AUTH_ERROR_KEYS) expect(errors[key], key).toBeTruthy();
  });
});
