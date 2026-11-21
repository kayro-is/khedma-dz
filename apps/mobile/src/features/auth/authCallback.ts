/**
 * Analyse du lien reçu après un clic dans un e-mail Supabase (confirmation, mot de passe oublié).
 * Flux PKCE : succès → `?code=…` ; échec → `error_code` / `error_description` (requête ou fragment).
 * Logique pure, testée.
 */
export type AuthCallbackNext = 'reset-password' | 'home';

export type AuthCallbackParams =
  | { kind: 'code'; code: string; next: AuthCallbackNext }
  | { kind: 'error'; errorCode: string }
  | { kind: 'empty' };

function collectParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const [beforeHash = '', hash = ''] = url.split('#', 2);
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  for (const part of [query, hash]) {
    for (const [key, value] of new URLSearchParams(part)) params.set(key, value);
  }
  return params;
}

export function parseAuthCallback(
  url: string | null | undefined,
  routeParams: Record<string, string | string[] | undefined> = {},
): AuthCallbackParams {
  const params = url ? collectParams(url) : new Map<string, string>();
  const pick = (name: string) => {
    const fromRoute = routeParams[name];
    return params.get(name) ?? (Array.isArray(fromRoute) ? fromRoute[0] : fromRoute);
  };

  const errorCode = pick('error_code') ?? pick('error');
  if (errorCode) return { kind: 'error', errorCode };

  const code = pick('code');
  if (code && /^[A-Za-z0-9-_.]{8,}$/.test(code)) {
    return {
      kind: 'code',
      code,
      next: pick('next') === 'reset-password' ? 'reset-password' : 'home',
    };
  }
  return { kind: 'empty' };
}
