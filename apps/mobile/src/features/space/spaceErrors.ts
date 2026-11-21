/**
 * Erreurs de l'espace Artisan (lecture des rôles, activation) → clé i18n. Logique pure, testée.
 */
import { authErrorKey } from '@/features/auth/authErrors';

export const SPACE_ERROR_KEYS = [
  'network',
  'sessionExpired',
  'notAllowed',
  'invalidSelection',
  'activationFailed',
] as const;

export type SpaceErrorKey = (typeof SPACE_ERROR_KEYS)[number];

type ErrorLike = { code?: unknown };

export function spaceErrorKey(error: unknown): SpaceErrorKey {
  if (!error || typeof error !== 'object') return 'activationFailed';
  const { code } = error as ErrorLike;
  // RLS : compte non actif (suspendu) ou tentative pour un autre utilisateur.
  if (code === '42501') return 'notAllowed';
  // Métier ou commune inexistant(e) / désactivé(e), ou valeur hors contraintes.
  if (code === '23503' || code === '23514' || code === '22P02') return 'invalidSelection';
  if (code === 'PGRST301' || code === 'PGRST303') return 'sessionExpired';
  const auth = authErrorKey(error);
  if (auth === 'network') return 'network';
  if (auth === 'sessionExpired') return 'sessionExpired';
  return 'activationFailed';
}

/** Déjà artisan (profil existant) : l'activation est considérée comme acquise. */
export const isAlreadyArtisanError = (error: unknown) =>
  !!error && typeof error === 'object' && (error as ErrorLike).code === '23505';
