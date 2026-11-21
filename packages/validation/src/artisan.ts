import { z } from 'zod';

import { VALIDATION_MESSAGES as M } from './messages';
import { normalizeDzMobilePhone } from './phone';

// Caractères de contrôle et séparateurs invisibles (retours à la ligne, tabulations, BOM…).
const INVISIBLE_RANGES: readonly [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
];
const hasInvisibleChars = (value: string) =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return INVISIBLE_RANGES.some(([from, to]) => code >= from && code <= to);
  });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nom d'activité (enseigne) : 2 à 80 caractères, comme la contrainte artisan_profiles.business_name. */
export const businessNameSchema = z
  .string({ error: M.required })
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(1, { error: M.required })
      .min(2, { error: M.businessNameTooShort })
      .max(80, { error: M.businessNameTooLong })
      .refine((value) => !hasInvisibleChars(value), { error: M.businessNameInvalid })
      .refine((value) => /[\p{L}\p{N}]/u.test(value), { error: M.businessNameInvalid }),
  );

/** Années d'expérience, facultatives : champ texte du formulaire → entier 0 à 70 ou null. */
export const yearsExperienceSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (text === '') return null;
    if (!/^\d{1,2}$/.test(text)) {
      ctx.addIssue({ code: 'custom', message: M.yearsExperienceInvalid });
      return z.NEVER;
    }
    const years = Number(text);
    if (years > 70) {
      ctx.addIssue({ code: 'custom', message: M.yearsExperienceInvalid });
      return z.NEVER;
    }
    return years;
  });

/**
 * Activation de l'espace Artisan (KHD-006). Champs alignés sur les colonnes que l'utilisateur
 * a le droit d'insérer dans artisan_profiles ; le rôle ARTISAN est attribué par le serveur.
 */
export const artisanActivationSchema = z.object({
  businessName: businessNameSchema,
  categoryId: z.string({ error: M.categoryRequired }).regex(UUID, { error: M.categoryRequired }),
  communeId: z
    .number({ error: M.communeRequired })
    .int({ error: M.communeRequired })
    .positive({ error: M.communeRequired }),
  yearsExperience: yearsExperienceSchema,
});

export type ArtisanActivationInput = z.input<typeof artisanActivationSchema>;
export type ArtisanActivationValues = z.output<typeof artisanActivationSchema>;

// -----------------------------------------------------------------------------
// KHD-008 — Profil professionnel complet
// -----------------------------------------------------------------------------

/** Règles partagées avec le serveur (migration 20261122090000_artisan_professional_profile). */
export const ARTISAN_RULES = {
  publishDescriptionMin: 50,
  descriptionMax: 2000,
  secondaryTradesMax: 5,
  zonesMax: 50,
  portfolioMax: 20,
  captionMax: 100,
} as const;

export const ARTISAN_AVAILABILITY = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] as const;
export type ArtisanAvailability = (typeof ARTISAN_AVAILABILITY)[number];

/** Texte libre facultatif : espaces normalisés, chaîne vide → null. */
const optionalText = (max: number, tooLong: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      const text = (value ?? '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return text === '' ? null : text;
    })
    .pipe(z.string().max(max, { error: tooLong }).nullable());

/** Téléphone professionnel facultatif (mobile algérien) : vide → null, sinon format +213. */
export const optionalDzMobilePhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    const text = (value ?? '').trim();
    if (text === '') return null;
    const normalized = normalizeDzMobilePhone(text);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: M.phoneInvalid });
      return z.NEVER;
    }
    return normalized;
  });

/** Informations professionnelles (colonnes modifiables de artisan_profiles). */
export const artisanProfileSchema = z.object({
  businessName: businessNameSchema,
  description: optionalText(ARTISAN_RULES.descriptionMax, M.descriptionTooLong),
  yearsExperience: yearsExperienceSchema,
  availability: z.enum(ARTISAN_AVAILABILITY, { error: M.required }),
  communeId: z
    .number({ error: M.communeRequired })
    .int({ error: M.communeRequired })
    .positive({ error: M.communeRequired }),
  professionalPhone: optionalDzMobilePhoneSchema,
});

export type ArtisanProfileInput = z.input<typeof artisanProfileSchema>;
export type ArtisanProfileValues = z.output<typeof artisanProfileSchema>;

/** Métier principal + métiers secondaires (5 au maximum, distincts du principal). */
export const artisanTradesSchema = z
  .object({
    primaryCategoryId: z
      .string({ error: M.categoryRequired })
      .regex(UUID, { error: M.categoryRequired }),
    secondaryCategoryIds: z
      .array(z.string().regex(UUID, { error: M.categoryRequired }))
      .max(ARTISAN_RULES.secondaryTradesMax, { error: M.tradesTooMany }),
  })
  .transform((value) => ({
    primaryCategoryId: value.primaryCategoryId,
    secondaryCategoryIds: [...new Set(value.secondaryCategoryIds)].filter(
      (id) => id !== value.primaryCategoryId,
    ),
  }));

export type ArtisanTradesInput = z.input<typeof artisanTradesSchema>;
export type ArtisanTradesValues = z.output<typeof artisanTradesSchema>;

/** Légende facultative d'une réalisation. */
export const portfolioCaptionSchema = optionalText(ARTISAN_RULES.captionMax, M.captionTooLong);

/** Conditions de publication vérifiées aussi par le serveur. */
export function publicationRequirements(input: {
  description: string | null | undefined;
  zonesCount: number;
}) {
  const descriptionLength = (input.description ?? '').trim().length;
  const description = descriptionLength >= ARTISAN_RULES.publishDescriptionMin;
  const zones = input.zonesCount > 0;
  return { description, descriptionLength, zones, canPublish: description && zones };
}
