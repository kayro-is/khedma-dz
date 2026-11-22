/**
 * Retour arrière sûr (KHD-008-NAV).
 *
 * `router.back()` sans historique déclenche « The action 'GO_BACK' was not handled by any
 * navigator ». C'est le cas d'un écran ouvert par `router.replace` ou par une redirection de
 * garde (ex. après déconnexion, « Se connecter » est le seul écran ; « Créer un compte » le
 * remplace, et son bouton retour n'a plus rien derrière lui).
 *
 * Règle : on revient en arrière s'il existe un écran précédent, sinon on remplace l'écran par
 * une destination de secours propre au parcours. Ne jamais appeler `router.back()` ailleurs
 * (vérifié par un test).
 */
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/** Destinations de secours par parcours (jamais un écran d'authentification une fois connecté). */
export const BACK_FALLBACK = {
  /** Écrans d'authentification (déconnecté). */
  auth: '/sign-in',
  /** Accueil public / écran d'entrée : la garde ouvre l'espace adapté si l'on est connecté. */
  entry: '/',
  /** Gestion du profil professionnel (espace Artisan). */
  pro: '/artisan/profil',
} as const satisfies Record<string, Href>;

/** Décision pure, testée : revenir en arrière ou aller à la destination de secours. */
export function backAction(canGoBack: boolean): 'back' | 'fallback' {
  return canGoBack ? 'back' : 'fallback';
}

/** Retour arrière, ou destination de secours s'il n'y a aucun écran précédent. */
export function safeBack(fallback: Href): void {
  if (backAction(router.canGoBack()) === 'back') router.back();
  else router.replace(fallback);
}

/**
 * Pour les écrans qui peuvent être le premier de l'historique : bouton Retour Android redirigé
 * vers la destination de secours (au lieu de fermer l'application) quand il n'y a rien derrière.
 * S'il existe un écran précédent, le comportement normal est conservé (y compris la protection
 * contre la perte de modifications non enregistrées). Renvoie le retour sûr pour l'en-tête.
 */
export function useSafeBack(fallback: Href): () => void {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) return false;
        router.replace(fallback);
        return true;
      });
      return () => subscription.remove();
    }, [fallback]),
  );
  return useCallback(() => safeBack(fallback), [fallback]);
}
