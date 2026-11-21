import { z } from 'zod';

import { VALIDATION_MESSAGES } from './messages';

/**
 * Numéros mobiles algériens (préfixes 05, 06, 07 suivis de 8 chiffres).
 * Formats acceptés en saisie : 0XXXXXXXXX, +213XXXXXXXXX, 00213XXXXXXXXX,
 * avec espaces, points, tirets ou parenthèses éventuels.
 * Sortie normalisée : E.164 (+213XXXXXXXXX), format attendu par Supabase Auth (OTP SMS).
 */
const DZ_MOBILE_REGEX = /^(?:\+213|00213|0)([567]\d{8})$/;

export function normalizeDzMobilePhone(input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, '');
  const match = DZ_MOBILE_REGEX.exec(compact);
  return match ? `+213${match[1]}` : null;
}

export const dzMobilePhoneSchema = z
  .string({ error: VALIDATION_MESSAGES.required })
  .trim()
  .min(1, { error: VALIDATION_MESSAGES.required })
  .transform((value, ctx) => {
    const normalized = normalizeDzMobilePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.phoneInvalid });
      return z.NEVER;
    }
    return normalized;
  });

/** Affichage lisible d'un numéro normalisé : +213555123456 → « 0555 12 34 56 ». */
export function formatDzMobileForDisplay(e164: string | null | undefined): string | null {
  const match = /^\+213([567]\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164 ?? '');
  return match ? `0${match[1]} ${match[2]} ${match[3]} ${match[4]}` : (e164 ?? null);
}
