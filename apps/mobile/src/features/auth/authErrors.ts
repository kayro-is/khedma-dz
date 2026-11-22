/**
 * Traduit une erreur Supabase Auth (ou réseau) en clé i18n « auth.errors.* ».
 * Logique pure : aucune dépendance React Native, testée unitairement.
 * Les messages ne révèlent jamais si un compte existe (pas d'énumération d'adresses).
 */
export const AUTH_ERROR_KEYS = [
  'invalidCredentials',
  'emailNotConfirmed',
  'emailTaken',
  'weakPassword',
  'samePassword',
  'emailRateLimit',
  'tooManyRequests',
  'linkExpired',
  'sessionExpired',
  'emailInvalid',
  'emailNotAuthorized',
  'signupDisabled',
  'accountSuspended',
  'reauthenticationNeeded',
  'signupRejected',
  'emailSendFailed',
  'serverUnavailable',
  'network',
  'unknown',
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

const CODE_MAP: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  over_email_send_rate_limit: 'emailRateLimit',
  over_request_rate_limit: 'tooManyRequests',
  over_sms_send_rate_limit: 'tooManyRequests',
  otp_expired: 'linkExpired',
  flow_state_expired: 'linkExpired',
  flow_state_not_found: 'linkExpired',
  bad_code_verifier: 'linkExpired',
  bad_oauth_state: 'linkExpired',
  session_expired: 'sessionExpired',
  session_not_found: 'sessionExpired',
  refresh_token_not_found: 'sessionExpired',
  refresh_token_already_used: 'sessionExpired',
  email_address_invalid: 'emailInvalid',
  email_address_not_authorized: 'emailNotAuthorized',
  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
  user_banned: 'accountSuspended',
  reauthentication_needed: 'reauthenticationNeeded',
  reauthentication_not_valid: 'reauthenticationNeeded',
};

type ErrorLike = { code?: unknown; status?: unknown; name?: unknown; message?: unknown };

export function authErrorKey(error: unknown): AuthErrorKey {
  if (!error || typeof error !== 'object') return 'unknown';
  const e = error as ErrorLike;

  if (typeof e.code === 'string' && CODE_MAP[e.code]) return CODE_MAP[e.code] as AuthErrorKey;

  // Erreurs serveur (5xx). Attention : @supabase/auth-js les signale TOUTES comme
  // « AuthRetryableFetchError » (HTTP 500 compris). Elles ne doivent jamais être présentées
  // comme une absence de connexion internet (KHD-008-AUTH-UX).
  if (typeof e.status === 'number' && e.status >= 500) {
    const message = typeof e.message === 'string' ? e.message : '';
    // Échec du trigger de création de profil (ex. numéro de téléphone déjà utilisé) : rien n'est créé.
    if (/database error saving new user/i.test(message)) return 'signupRejected';
    if (/error sending .*(email|mail)/i.test(message)) return 'emailSendFailed';
    return 'serverUnavailable';
  }

  // Erreurs réseau : client hors ligne, délai dépassé, DNS… (aucune réponse du serveur).
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) return 'network';
  if (
    typeof e.message === 'string' &&
    /network request failed|failed to fetch|fetch failed|timeout/i.test(e.message)
  ) {
    return 'network';
  }
  if (e.status === 429) return 'tooManyRequests';
  // Anciennes versions de GoTrue sans code d'erreur.
  if (typeof e.message === 'string' && /invalid login credentials/i.test(e.message))
    return 'invalidCredentials';
  if (typeof e.message === 'string' && /email not confirmed/i.test(e.message))
    return 'emailNotConfirmed';
  return 'unknown';
}

export function authErrorI18nKey(error: unknown): `auth.errors.${AuthErrorKey}` {
  return `auth.errors.${authErrorKey(error)}`;
}
