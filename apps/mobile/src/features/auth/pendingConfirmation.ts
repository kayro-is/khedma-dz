/**
 * Confirmation d'adresse e-mail après inscription (KHD-008-AUTH-UX) — logique pure, testée.
 *
 * Pourquoi : dans Expo Go, le lien de l'e-mail (exp://…/--/auth-callback) ne rouvre pas
 * l'application de façon fiable. Supabase confirme bien l'adresse côté serveur, mais
 * l'application n'en est pas informée. Le bouton « J'ai confirmé mon e-mail » interroge donc
 * Supabase : une connexion avec les identifiants saisis réussit si l'adresse est confirmée et
 * échoue avec `email_not_confirmed` sinon. Aucun succès n'est jamais déduit d'un état local.
 *
 * Les identifiants restent UNIQUEMENT en mémoire (jamais stockés, jamais dans une URL ni un
 * journal), 15 minutes au plus, et sont effacés dès la confirmation ou la sortie de l'écran.
 */
import type { AuthResult } from './authService';

export const PENDING_CONFIRMATION_TTL_MS = 15 * 60 * 1000;
/** Délai minimal entre deux vérifications (limite de connexions de Supabase Auth). */
export const CONFIRMATION_CHECK_COOLDOWN_SECONDS = 5;

type Pending = { email: string; password: string; createdAt: number };

let pending: Pending | null = null;

const normalize = (email: string) => email.trim().toLowerCase();

export function rememberPendingConfirmation(
  email: string,
  password: string,
  now: number = Date.now(),
): void {
  pending = { email: normalize(email), password, createdAt: now };
}

/** Identifiants encore valables pour CETTE adresse, sinon null (et effacement s'ils ont expiré). */
export function pendingCredentials(
  email: string,
  now: number = Date.now(),
): { email: string; password: string } | null {
  if (!pending) return null;
  if (now - pending.createdAt > PENDING_CONFIRMATION_TTL_MS) {
    pending = null;
    return null;
  }
  if (pending.email !== normalize(email)) return null;
  return { email: pending.email, password: pending.password };
}

export function clearPendingConfirmation(): void {
  pending = null;
}

/**
 * Confirmation tout juste établie par Supabase : l'écran d'entrée affiche « Adresse e-mail
 * confirmée » une seule fois, même si la garde de navigation redirige avant notre navigation.
 */
let justConfirmed = false;

export function markJustConfirmed(): void {
  justConfirmed = true;
}

export function isJustConfirmed(): boolean {
  return justConfirmed;
}

export function clearJustConfirmed(): void {
  justConfirmed = false;
}

export type ConfirmationOutcome =
  /** Adresse confirmée par Supabase et session ouverte. */
  | 'confirmed'
  /** Supabase indique que l'adresse n'est pas encore confirmée. */
  | 'notConfirmed'
  /** Identifiants indisponibles (application relancée, délai dépassé) : passer par la connexion. */
  | 'needSignIn'
  | 'tooManyRequests'
  | 'network'
  | 'error';

/** Résultat de la vérification, uniquement à partir de la réponse de Supabase. */
export function confirmationOutcome(result: AuthResult | null): ConfirmationOutcome {
  if (result === null) return 'needSignIn';
  if (result.ok) return 'confirmed';
  switch (result.error) {
    case 'emailNotConfirmed':
      return 'notConfirmed';
    case 'invalidCredentials':
      return 'needSignIn';
    case 'tooManyRequests':
      return 'tooManyRequests';
    case 'network':
      return 'network';
    default:
      return 'error';
  }
}
