import { z } from 'zod';

import { VALIDATION_MESSAGES } from './messages';

/**
 * Montant en dinars algériens. Toujours numérique, jamais une chaîne.
 * Stocké en base en NUMERIC(12,2) : 2 décimales max, plafond 9 999 999 999,99 DZD.
 */
export const DZD_MAX_AMOUNT = 9_999_999_999.99;

function hasAtMostTwoDecimals(value: number): boolean {
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

export const dzdAmountSchema = z
  .number({ error: VALIDATION_MESSAGES.amountInvalid })
  .positive({ error: VALIDATION_MESSAGES.amountInvalid })
  .max(DZD_MAX_AMOUNT, { error: VALIDATION_MESSAGES.amountTooLarge })
  .refine(hasAtMostTwoDecimals, { error: VALIDATION_MESSAGES.amountInvalid });
