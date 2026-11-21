import { z } from 'zod';

import { passwordSchema, personNameSchema } from './auth';
import { VALIDATION_MESSAGES as M } from './messages';
import { dzMobilePhoneSchema } from './phone';

/**
 * Modification du profil. Champs alignés sur les colonnes modifiables (droits par colonne) :
 * profiles.first_name / last_name, profile_private.phone / commune_id.
 */
export const profileUpdateSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: dzMobilePhoneSchema,
  communeId: z
    .number({ error: M.communeInvalid })
    .int({ error: M.communeInvalid })
    .positive({ error: M.communeInvalid })
    .nullable(),
});

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdateValues = z.output<typeof profileUpdateSchema>;

/** Changement de mot de passe : le mot de passe actuel est revérifié avant toute modification. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: M.required }).min(1, { error: M.required }),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: M.required }).min(1, { error: M.required }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: M.passwordsMismatch,
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    error: M.passwordSameAsCurrent,
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

/**
 * Confirmation de suppression : l'utilisateur ressaisit son adresse e-mail
 * (indépendant de la langue, impossible à valider par réflexe).
 */
export function deleteAccountSchema(email: string) {
  const expected = email.trim().toLowerCase();
  return z.object({
    confirmation: z
      .string({ error: M.required })
      .trim()
      .min(1, { error: M.required })
      .refine((value) => value.toLowerCase() === expected, { error: M.deleteConfirmationMismatch }),
  });
}

export type DeleteAccountInput = { confirmation: string };
