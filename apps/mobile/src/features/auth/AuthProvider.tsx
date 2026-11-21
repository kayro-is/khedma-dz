import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { supabase } from '@/services/supabase';

import { authReducer, initialAuthState, type AuthState } from './authState';

type AuthContextValue = AuthState & {
  /**
   * Déconnexion volontaire. `local` : cet appareil uniquement ; `global` : toutes les sessions
   * du compte (appareil perdu ou volé). Les jetons concernés sont révoqués côté serveur.
   */
  signOut: (scope?: 'local' | 'global') => Promise<void>;
  /** Marque la prochaine déconnexion comme volontaire (ex. suppression de compte). */
  expectSignOut: () => void;
  completePasswordRecovery: () => void;
  acknowledgeSignOutReason: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Source unique de vérité sur la session. Écoute Supabase Auth :
 * INITIAL_SESSION (lecture du stockage chiffré), SIGNED_IN, TOKEN_REFRESHED,
 * PASSWORD_RECOVERY, USER_UPDATED, SIGNED_OUT (volontaire ou jeton révoqué / expiré).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const manualSignOut = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      dispatch({ type: 'auth-event', event, session, manualSignOut: manualSignOut.current });
      if (event === 'SIGNED_OUT') manualSignOut.current = false;
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async (scope: 'local' | 'global' = 'local') => {
    manualSignOut.current = true;
    const { error } = await supabase.auth.signOut({ scope });
    if (error) {
      manualSignOut.current = false;
      throw error;
    }
  }, []);

  const expectSignOut = useCallback(() => {
    manualSignOut.current = true;
  }, []);

  const completePasswordRecovery = useCallback(() => dispatch({ type: 'recovery-completed' }), []);
  const acknowledgeSignOutReason = useCallback(() => dispatch({ type: 'reason-acknowledged' }), []);

  const value = useMemo(
    () => ({
      ...state,
      signOut,
      expectSignOut,
      completePasswordRecovery,
      acknowledgeSignOutReason,
    }),
    [state, signOut, expectSignOut, completePasswordRecovery, acknowledgeSignOutReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return context;
}
