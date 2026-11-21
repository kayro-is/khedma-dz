import { describe, expect, it } from 'vitest';

import {
  evaluatePassword,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './auth';
import { VALIDATION_MESSAGES as M } from './messages';

const validSignUp = {
  firstName: 'Amina',
  lastName: 'Belkacem',
  email: '  Amina.Belkacem@Exemple.DZ ',
  phone: '0555 12 34 56',
  password: 'Khedma2026',
  confirmPassword: 'Khedma2026',
  acceptTerms: true,
};

function firstError(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('signUpSchema', () => {
  it('normalise e-mail et téléphone', () => {
    const data = signUpSchema.parse(validSignUp);
    expect(data.email).toBe('amina.belkacem@exemple.dz');
    expect(data.phone).toBe('+213555123456');
  });

  it('accepte des noms arabes et composés', () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      firstName: 'محمد أمين',
      lastName: "Ben M'hidi-Larbi",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['password', 'court1A', M.passwordTooShort],
    ['password', 'sansmajuscule1', M.passwordUppercase],
    ['password', 'SANSMINUSCULE1', M.passwordLowercase],
    ['password', 'SansChiffre', M.passwordDigit],
    ['email', 'pas-un-email', M.emailInvalid],
    ['phone', '0455123456', M.phoneInvalid],
    ['firstName', '1234', M.nameInvalid],
    ['firstName', '', M.required],
  ])('rejette %s = %j (%s)', (field, value, message) => {
    const input = {
      ...validSignUp,
      [field]: value,
      ...(field === 'password' ? { confirmPassword: value } : {}),
    };
    expect(firstError(signUpSchema.safeParse(input), field)).toBe(message);
  });

  it('exige la même confirmation du mot de passe', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'Autre2026' });
    expect(firstError(result, 'confirmPassword')).toBe(M.passwordsMismatch);
  });

  it("exige l'acceptation des conditions", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, acceptTerms: false });
    expect(firstError(result, 'acceptTerms')).toBe(M.termsRequired);
  });

  it('refuse un mot de passe de plus de 72 octets', () => {
    const long = 'Aa1' + 'é'.repeat(40); // 3 + 80 octets
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: long,
      confirmPassword: long,
    });
    expect(firstError(result, 'password')).toBe(M.passwordTooLong);
  });
});

describe('signInSchema', () => {
  it("n'applique pas les règles de robustesse à la connexion", () => {
    expect(signInSchema.safeParse({ email: 'a@b.dz', password: 'x' }).success).toBe(true);
  });

  it('exige les deux champs', () => {
    const result = signInSchema.safeParse({ email: '', password: '' });
    expect(firstError(result, 'email')).toBe(M.required);
    expect(firstError(result, 'password')).toBe(M.required);
  });
});

describe('forgot / reset', () => {
  it('valide l’e-mail de récupération', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false);
  });

  it('applique les règles au nouveau mot de passe', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'Nouveau2026', confirmPassword: 'Nouveau2026' })
        .success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: 'faible', confirmPassword: 'faible' }).success,
    ).toBe(false);
  });
});

describe('evaluatePassword', () => {
  it('vide → niveau 0', () => {
    expect(evaluatePassword('').level).toBe(0);
  });

  it('règles non respectées → faible', () => {
    const s = evaluatePassword('abcdefgh');
    expect(s.level).toBe(1);
    expect(s.valid).toBe(false);
    expect(s.rules).toEqual({ length: true, lowercase: true, uppercase: false, digit: false });
  });

  it('suite évidente pénalisée', () => {
    expect(evaluatePassword('Azerty1234').level).toBe(1);
  });

  it('valide minimal → moyen, long + symbole → excellent', () => {
    expect(evaluatePassword('Tlemcen7').level).toBe(2);
    expect(evaluatePassword('Tlemcen7!').level).toBe(3);
    expect(evaluatePassword('Tlemcen-Oran-2026!').level).toBe(4);
  });

  it('comme Supabase, seules les lettres latines ASCII comptent (É n’est pas une majuscule)', () => {
    expect(evaluatePassword('élodie2026').rules.uppercase).toBe(false);
    expect(evaluatePassword('Élodie2026').rules.uppercase).toBe(false);
    expect(evaluatePassword('Elodie2026').rules.uppercase).toBe(true);
  });
});
