/**
 * Profil artisan professionnel (KHD-008) — logique pure, testée.
 * Les règles de publication sont celles du serveur (voir @khedma/validation, ARTISAN_RULES).
 */
import { ARTISAN_RULES, publicationRequirements } from '@khedma/validation';

import { authErrorKey } from '@/features/auth/authErrors';

// ----------------------------------------------------------------------------- Zones

export type ZonePlan = {
  added: number[];
  removed: number[];
  /** Étapes dans l'ordre d'exécution. */
  steps: ({ kind: 'insert'; ids: number[] } | { kind: 'delete'; ids: number[] })[];
};

/**
 * Ordre des opérations pour passer des zones actuelles aux zones voulues sans jamais :
 * - laisser un profil publié sans zone (on ajoute avant de retirer) ;
 * - dépasser la limite de 50 zones (on retire d'abord ce qui peut l'être).
 */
export function planZoneChanges(current: readonly number[], next: readonly number[]): ZonePlan {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  const added = [...nextSet].filter((id) => !currentSet.has(id));
  const removed = [...currentSet].filter((id) => !nextSet.has(id));
  const steps: ZonePlan['steps'] = [];
  if (currentSet.size + added.length <= ARTISAN_RULES.zonesMax) {
    if (added.length) steps.push({ kind: 'insert', ids: added });
    if (removed.length) steps.push({ kind: 'delete', ids: removed });
  } else {
    // Retirer d'abord, en gardant une zone si toutes les zones actuelles sont remplacées.
    const keep = removed.length === currentSet.size ? removed.slice(-1) : [];
    const first = removed.filter((id) => !keep.includes(id));
    if (first.length) steps.push({ kind: 'delete', ids: first });
    if (added.length) steps.push({ kind: 'insert', ids: added });
    if (keep.length) steps.push({ kind: 'delete', ids: keep });
  }
  return { added, removed, steps };
}

// ----------------------------------------------------------------------------- Métiers

export type TradePlan = {
  primaryChanged: boolean;
  insert: string[];
  delete: string[];
};

/**
 * Changement de métiers : le serveur ajoute lui-même le nouveau métier principal aux services
 * et interdit de retirer le métier principal ; on met donc à jour le principal d'abord, puis on
 * retire avant d'ajouter (limite de 6 métiers au total).
 */
export function planTradeChanges(
  current: { primaryCategoryId: string; serviceIds: readonly string[] },
  next: { primaryCategoryId: string; secondaryCategoryIds: readonly string[] },
): TradePlan {
  const wanted = new Set([next.primaryCategoryId, ...next.secondaryCategoryIds]);
  const existing = new Set([...current.serviceIds, next.primaryCategoryId]);
  return {
    primaryChanged: current.primaryCategoryId !== next.primaryCategoryId,
    delete: current.serviceIds.filter((id) => !wanted.has(id)),
    insert: [...wanted].filter((id) => !existing.has(id)),
  };
}

// ----------------------------------------------------------------------------- Complétude

export type CompletionKey = 'description' | 'zones' | 'photo' | 'portfolio' | 'experience';

export type CompletionItem = { key: CompletionKey; done: boolean; required: boolean };

export function profileCompletion(input: {
  description: string | null;
  zonesCount: number;
  hasAvatar: boolean;
  portfolioCount: number;
  yearsExperience: number | null;
}) {
  const rules = publicationRequirements(input);
  const items: CompletionItem[] = [
    { key: 'description', done: rules.description, required: true },
    { key: 'zones', done: rules.zones, required: true },
    { key: 'photo', done: input.hasAvatar, required: false },
    { key: 'portfolio', done: input.portfolioCount > 0, required: false },
    { key: 'experience', done: input.yearsExperience !== null, required: false },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    items,
    percent: Math.round((done / items.length) * 100),
    canPublish: rules.canPublish,
    descriptionLength: rules.descriptionLength,
  };
}

// ----------------------------------------------------------------------------- Galerie

/** Déplace un élément d'une position (−1 : avant, +1 : après). Renvoie la même liste si impossible. */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const copy = [...items];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved as T);
  return copy;
}

/** Chemin Storage d'une photo de réalisation : <artisan>/<réalisation>/<horodatage>.jpg. */
export function buildPortfolioPath(userId: string, itemId: string, timestamp: number): string {
  return `${userId}/${itemId}/${timestamp}.jpg`;
}

export function isOwnPortfolioPath(
  userId: string,
  path: string | null | undefined,
): path is string {
  return typeof path === 'string' && path.startsWith(`${userId}/`) && !path.includes('..');
}

/** Côté le plus long d'une photo de réalisation : net sur grand écran, léger à envoyer en 4G. */
export const PORTFOLIO_MAX_SIDE = 1600;

/** Dimensions cibles en conservant les proportions (jamais d'agrandissement). */
export function fitWithin(width: number, height: number, max = PORTFOLIO_MAX_SIDE) {
  if (width <= max && height <= max) return { width, height };
  return width >= height
    ? { width: max, height: Math.round((height * max) / width) }
    : { width: Math.round((width * max) / height), height: max };
}

/**
 * Renouvellement des URL signées (photos privées) : données jugées périmées à 40 % de la durée
 * de vie, rechargées automatiquement à 75 % ; une URL n'est donc jamais affichée expirée tant
 * que l'écran est ouvert. Au-delà, l'image en cache sur l'appareil reste affichée (clé = chemin).
 */
export function signedUrlRefresh(ttlSeconds: number) {
  return {
    staleTime: Math.round(ttlSeconds * 1000 * 0.4),
    refetchInterval: Math.round(ttlSeconds * 1000 * 0.75),
  };
}

// ----------------------------------------------------------------------------- Zones par wilaya

export type ZoneLike = {
  communeId: number;
  nameFr: string;
  nameAr: string;
  wilaya: { id: number; code: string; nameFr: string; nameAr: string } | null;
};

export function groupZonesByWilaya<T extends ZoneLike>(zones: readonly T[], locale: string) {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const label = (named: { nameFr: string; nameAr: string }) =>
    locale === 'ar' ? named.nameAr : named.nameFr;
  const groups = new Map<string, { code: string; name: string; zones: T[] }>();
  for (const zone of zones) {
    const code = zone.wilaya?.code ?? '00';
    const group = groups.get(code) ?? {
      code,
      name: zone.wilaya ? label(zone.wilaya) : '',
      zones: [],
    };
    group.zones.push(zone);
    groups.set(code, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((group) => ({
      ...group,
      zones: [...group.zones].sort((a, b) => collator.compare(label(a), label(b))),
    }));
}

// ----------------------------------------------------------------------------- Erreurs

export const PRO_ERROR_KEYS = [
  'publishDescription',
  'publishZone',
  'lastZone',
  'zonesLimit',
  'servicesLimit',
  'primaryService',
  'portfolioLimit',
  'photoFailed',
  'network',
  'sessionExpired',
  'saveFailed',
] as const;

export type ProErrorKey = (typeof PRO_ERROR_KEYS)[number];

const HINTS: Record<string, ProErrorKey> = {
  publish_description: 'publishDescription',
  publish_zone: 'publishZone',
  last_zone: 'lastZone',
  zones_limit: 'zonesLimit',
  services_limit: 'servicesLimit',
  primary_service: 'primaryService',
  portfolio_limit: 'portfolioLimit',
  portfolio_images_limit: 'portfolioLimit',
};

export function proErrorKey(error: unknown, fallback: ProErrorKey = 'saveFailed'): ProErrorKey {
  if (!error || typeof error !== 'object') return fallback;
  const { hint, code, name } = error as { hint?: unknown; code?: unknown; name?: unknown };
  if (typeof hint === 'string' && HINTS[hint]) return HINTS[hint];
  if (name === 'AvatarImageError') return 'photoFailed';
  if (code === 'PGRST301' || code === 'PGRST303') return 'sessionExpired';
  const auth = authErrorKey(error);
  if (auth === 'network') return 'network';
  if (auth === 'sessionExpired') return 'sessionExpired';
  return fallback;
}
