/**
 * Machine à états de la session (logique pure, testée).
 * Distingue une déconnexion volontaire d'une session expirée / révoquée,
 * pour pouvoir l'expliquer à l'utilisateur.
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';
export type SignOutReason = 'manual' | 'expired' | null;

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  /** Session ouverte par un lien « mot de passe oublié » : l'utilisateur doit en définir un nouveau. */
  passwordRecovery: boolean;
  signOutReason: SignOutReason;
};

export const initialAuthState: AuthState = {
  status: 'initializing',
  session: null,
  passwordRecovery: false,
  signOutReason: null,
};

export type AuthAction =
  | { type: 'auth-event'; event: AuthChangeEvent; session: Session | null; manualSignOut: boolean }
  | { type: 'recovery-completed' }
  | { type: 'reason-acknowledged' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'recovery-completed':
      return { ...state, passwordRecovery: false };
    case 'reason-acknowledged':
      return { ...state, signOutReason: null };
    case 'auth-event': {
      const { event, session, manualSignOut } = action;
      if (event === 'SIGNED_OUT' || !session) {
        const wasSignedIn = state.status === 'signedIn';
        return {
          status: 'signedOut',
          session: null,
          passwordRecovery: false,
          signOutReason: manualSignOut ? 'manual' : wasSignedIn ? 'expired' : state.signOutReason,
        };
      }
      return {
        status: 'signedIn',
        session,
        passwordRecovery: event === 'PASSWORD_RECOVERY' ? true : state.passwordRecovery,
        signOutReason: null,
      };
    }
  }
}

/**
 * Écran d'entrée selon l'état : choix de la langue, accueil public, nouveau mot de passe,
 * ou `space` : l'espace connecté, Particulier ou Artisan (voir features/space/spaceState.ts).
 */
export function resolveEntryRoute(input: {
  hasChosenLocale: boolean;
  status: AuthStatus;
  passwordRecovery: boolean;
}): '/language' | '/reset-password' | 'space' | null {
  if (!input.hasChosenLocale) return '/language';
  if (input.status !== 'signedIn') return null;
  return input.passwordRecovery ? '/reset-password' : 'space';
}
