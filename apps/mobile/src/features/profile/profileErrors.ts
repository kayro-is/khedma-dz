/**
 * Traduit les erreurs de profil (PostgREST, Storage, fonctions SQL, réseau) en clé i18n.
 * Logique pure, testée.
 */
import { authErrorKey } from '@/features/auth/authErrors';

export const PROFILE_ERROR_KEYS = [
  'phoneTaken',
  'activeJobs',
  'wrongCurrentPassword',
  'photoFailed',
  'saveFailed',
  'network',
  'sessionExpired',
] as const;

export type ProfileErrorKey = (typeof PROFILE_ERROR_KEYS)[number];

type ErrorLike = { code?: unknown; message?: unknown; hint?: unknown; details?: unknown };

export function profileErrorKey(
  error: unknown,
  fallback: ProfileErrorKey = 'saveFailed',
): ProfileErrorKey {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as ErrorLike;

  // Contrainte d'unicité sur profile_private.phone.
  if (e.code === '23505' && /phone/i.test(`${String(e.message)} ${String(e.details)}`))
    return 'phoneTaken';
  // Exception levée par public.delete_my_account().
  if (
    e.hint === 'active_jobs' ||
    (typeof e.message === 'string' && e.message.includes('active_jobs'))
  ) {
    return 'activeJobs';
  }
  // JWT expiré ou invalide côté PostgREST.
  if (e.code === 'PGRST301' || e.code === 'PGRST303') return 'sessionExpired';

  const auth = authErrorKey(error);
  if (auth === 'network') return 'network';
  if (auth === 'invalidCredentials') return 'wrongCurrentPassword';
  if (auth === 'sessionExpired') return 'sessionExpired';
  return fallback;
}

/** Chemin de l'avatar : dossier propriétaire (exigé par la politique Storage) + nom unique (cache). */
export function buildAvatarPath(userId: string, timestamp: number): string {
  return `${userId}/avatar-${timestamp}.jpg`;
}

/** Vrai si le chemin appartient bien au dossier de l'utilisateur (avant suppression d'un ancien avatar). */
export function isOwnAvatarPath(userId: string, path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith(`${userId}/`) && !path.includes('..');
}
