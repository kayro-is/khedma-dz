/**
 * Constantes métier définies par le cahier des charges (sections 4 et 8).
 * Elles seront alignées sur les enums PostgreSQL créés dans KHD-003.
 */

/** Rôles métier. Un utilisateur peut cumuler les deux. */
export const BUSINESS_ROLES = ['PARTICULIER', 'ARTISAN'] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

/** Statuts d'une demande de prestation. */
export const SERVICE_REQUEST_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

/** Statuts d'une proposition (devis) d'artisan. */
export const PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** Degré d'urgence d'une demande (cahier des charges, section 5). */
export const REQUEST_URGENCIES = ['LOW', 'NORMAL', 'URGENT'] as const;
export type RequestUrgency = (typeof REQUEST_URGENCIES)[number];

/** Devise unique de la plateforme. */
export const CURRENCY = 'DZD' as const;
export type Currency = typeof CURRENCY;
