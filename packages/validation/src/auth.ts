import { z } from 'zod';

import { VALIDATION_MESSAGES as M } from './messages';
import { dzMobilePhoneSchema } from './phone';

/**
 * Règles identiques à la configuration Supabase Auth (supabase/config.toml) :
 * 8 caractères minimum, minuscule [a-z] + majuscule [A-Z] + chiffre (Supabase ne compte que les lettres
 * latines ASCII : « É » ne vaut pas majuscule). 72 octets max (limite bcrypt).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string({ error: M.required })
  .trim()
  .min(1, { error: M.required })
  .max(254, { error: M.emailInvalid })
  .pipe(z.email({ error: M.emailInvalid }))
  .transform((email) => email.toLowerCase());

export const passwordSchema = z
  .string({ error: M.required })
  .min(1, { error: M.required })
  .min(PASSWORD_MIN_LENGTH, { error: M.passwordTooShort })
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
    error: M.passwordTooLong,
  })
  .refine((value) => /[a-z]/.test(value), { error: M.passwordLowercase })
  .refine((value) => /[A-Z]/.test(value), { error: M.passwordUppercase })
  .refine((value) => /\d/.test(value), { error: M.passwordDigit });

/** Prénom / nom : lettres latines ou arabes, espaces, tirets, apostrophes. */
export const personNameSchema = z
  .string({ error: M.required })
  .trim()
  .min(1, { error: M.required })
  .max(60, { error: M.nameTooLong })
  // Tiret placé en fin de classe : littéral, sans échappement.
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u, { error: M.nameInvalid })
  .transform((value) => value.replace(/\s+/g, ' '));

export const signInSchema = z.object({
  email: emailSchema,
  // À la connexion, on ne réapplique pas les règles de robustesse (comptes antérieurs aux règles).
  password: z.string({ error: M.required }).min(1, { error: M.required }),
});

export const signUpSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: emailSchema,
    phone: dzMobilePhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: M.required }).min(1, { error: M.required }),
    acceptTerms: z.boolean().refine((value) => value, { error: M.termsRequired }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: M.passwordsMismatch,
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: M.required }).min(1, { error: M.required }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: M.passwordsMismatch,
    path: ['confirmPassword'],
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

// -----------------------------------------------------------------------------
// Robustesse du mot de passe (indicateur visuel). Les règles obligatoires restent celles du schéma.
// -----------------------------------------------------------------------------
export type PasswordRule = 'length' | 'lowercase' | 'uppercase' | 'digit';
export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  /** 0 = vide, 1 = faible, 2 = moyen, 3 = bon, 4 = excellent */
  level: PasswordStrengthLevel;
  rules: Record<PasswordRule, boolean>;
  /** Toutes les règles obligatoires sont respectées. */
  valid: boolean;
};

const COMMON_PATTERNS = [
  /^(.)\1+$/,
  /(0123|1234|2345|3456|4567|5678|6789|abcd|azerty|qwerty|password|motdepasse|khedma)/i,
];

export function evaluatePassword(password: string): PasswordStrength {
  const rules: Record<PasswordRule, boolean> = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
  const valid = Object.values(rules).every(Boolean);
  if (password.length === 0) return { level: 0, rules, valid };

  let score = Object.values(rules).filter(Boolean).length; // 0..4
  if (password.length >= 12) score += 1;
  if (/[^\p{L}\p{N}]/u.test(password)) score += 1; // symbole
  if (COMMON_PATTERNS.some((pattern) => pattern.test(password))) score -= 2;

  let level: PasswordStrengthLevel;
  if (!valid || score <= 3) level = 1;
  else if (score === 4) level = 2;
  else if (score === 5) level = 3;
  else level = 4;
  return { level, rules, valid };
}
