/**
 * Espace actif Particulier / Artisan (KHD-006) — logique pure, testée.
 *
 * Deux notions distinctes :
 * - la PRÉFÉRENCE d'interface (dernier espace choisi), stockée localement, sans valeur de sécurité ;
 * - l'AUTORISATION réelle : le rôle ARTISAN lu dans Supabase (table user_roles, attribué par le
 *   serveur uniquement). L'espace Artisan ne s'ouvre que si le serveur a confirmé ce rôle pendant
 *   la session en cours. Modifier le stockage local ne peut donc jamais ouvrir l'espace Artisan,
 *   et toutes les données restent de toute façon protégées par la RLS.
 */
export type Space = 'particulier' | 'artisan';

export const SPACE_HOME = {
  particulier: '/particulier',
  artisan: '/artisan',
} as const satisfies Record<Space, string>;

/** Clé de préférence propre à chaque compte (un autre compte sur le même téléphone repart à zéro). */
export const spaceStorageKey = (userId: string) => `khedma.space.v1.${userId}`;

/** Toute valeur inattendue (absente, corrompue, modifiée) retombe sur l'espace Particulier. */
export function parseStoredSpace(value: unknown): Space {
  return value === 'artisan' ? 'artisan' : 'particulier';
}

/** État des rôles lus sur le serveur pendant la session. */
export type RolesSnapshot =
  { status: 'pending' } | { status: 'error' } | { status: 'success'; isArtisan: boolean };

/**
 * Conversion depuis la requête TanStack : des données déjà reçues restent valables pendant un
 * rafraîchissement, même en échec (pas d'éjection de l'espace sur une coupure réseau passagère).
 */
export function toRolesSnapshot(query: {
  data: { isArtisan: boolean } | undefined;
  isError: boolean;
}): RolesSnapshot {
  if (query.data) return { status: 'success', isArtisan: query.data.isArtisan };
  return query.isError ? { status: 'error' } : { status: 'pending' };
}

export const isArtisanConfirmed = (roles: RolesSnapshot) =>
  roles.status === 'success' && roles.isArtisan;

export type SpaceResolution =
  | { kind: 'ready'; space: Space }
  /** Préférence ou rôles en cours de lecture. */
  | { kind: 'verifying' }
  /** Préférence Artisan mais rôle impossible à vérifier (réseau) : l'utilisateur choisit. */
  | { kind: 'unverified' };

/**
 * Espace à ouvrir au démarrage. Particulier par défaut, sans attendre le réseau.
 * @param preferred préférence locale, `null` tant qu'elle n'est pas lue.
 */
export function resolveSpace(preferred: Space | null, roles: RolesSnapshot): SpaceResolution {
  if (preferred === null) return { kind: 'verifying' };
  if (preferred === 'particulier') return { kind: 'ready', space: 'particulier' };
  if (roles.status === 'pending') return { kind: 'verifying' };
  if (roles.status === 'error') return { kind: 'unverified' };
  return { kind: 'ready', space: roles.isArtisan ? 'artisan' : 'particulier' };
}

/** Destination d'un changement d'espace demandé par l'utilisateur. */
export function switchTarget(
  target: Space,
  roles: RolesSnapshot,
): '/particulier' | '/artisan' | '/account/become-artisan' {
  if (target === 'particulier') return SPACE_HOME.particulier;
  return isArtisanConfirmed(roles) ? SPACE_HOME.artisan : '/account/become-artisan';
}
