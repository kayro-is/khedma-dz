/**
 * Non-régression KHD-008-NAV : « The action 'GO_BACK' was not handled by any navigator ».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { canGoBack: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('expo-router', () => ({ router, useFocusEffect: vi.fn() }));
vi.mock('react-native', () => ({ BackHandler: { addEventListener: vi.fn() } }));

const { BACK_FALLBACK, backAction, safeBack } = await import('./navigation');

beforeEach(() => {
  router.canGoBack.mockReset();
  router.back.mockReset();
  router.replace.mockReset();
});

describe('safeBack', () => {
  it('revient en arrière quand un écran précédent existe', () => {
    router.canGoBack.mockReturnValue(true);
    safeBack(BACK_FALLBACK.auth);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('RÉGRESSION : sans historique (ex. « Créer un compte » après déconnexion), aucun GO_BACK n’est émis', () => {
    router.canGoBack.mockReturnValue(false);
    safeBack(BACK_FALLBACK.auth);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/sign-in');
  });

  it('décision pure', () => {
    expect(backAction(true)).toBe('back');
    expect(backAction(false)).toBe('fallback');
  });
});

describe('destinations de secours', () => {
  it('parcours connectés : jamais un écran d’authentification', () => {
    expect(BACK_FALLBACK.entry).toBe('/');
    expect(BACK_FALLBACK.pro).toBe('/artisan/profil');
    for (const target of [BACK_FALLBACK.entry, BACK_FALLBACK.pro]) {
      expect(target).not.toMatch(/sign-in|sign-up|forgot-password|check-email/);
    }
  });

  it('parcours d’authentification : retour à la connexion', () => {
    expect(BACK_FALLBACK.auth).toBe('/sign-in');
  });
});

// L'analyse du code (aucun router.back() direct) est dans scripts/lint/navigation.test.mjs.
