/**
 * Garde-fou : une application cliente (mobile, navigateur) ne doit JAMAIS embarquer une clé
 * secrète Supabase. Accepte la « publishable key » (sb_publishable_…) ou l'ancienne clé « anon »
 * (JWT dont le rôle est `anon`). Refuse sb_secret_… et les JWT `service_role`.
 */
export type PublicKeyCheck = { ok: true } | { ok: false; reason: 'secret' | 'unknown' };

function decodeJwtRole(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

export function checkPublicSupabaseKey(key: string): PublicKeyCheck {
  const value = key.trim();
  if (value.startsWith('sb_secret_')) return { ok: false, reason: 'secret' };
  if (value.startsWith('sb_publishable_')) return { ok: true };
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) {
    const role = decodeJwtRole(value);
    if (role === 'anon') return { ok: true };
    if (role === 'service_role') return { ok: false, reason: 'secret' };
  }
  return { ok: false, reason: 'unknown' };
}

/** Lève une erreur explicite (sans jamais inclure la clé) si la clé n'est pas publique. */
export function assertPublicSupabaseKey(key: string, variableName: string): void {
  const result = checkPublicSupabaseKey(key);
  if (result.ok) return;
  throw new Error(
    result.reason === 'secret'
      ? `${variableName} contient une clé SECRÈTE Supabase : utilisez la « Publishable key » (sb_publishable_…). Révoquez la clé secrète si elle a été partagée.`
      : `${variableName} n'est pas une clé publique Supabase reconnue (attendu : sb_publishable_…).`,
  );
}
