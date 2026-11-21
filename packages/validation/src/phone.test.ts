import { describe, expect, it } from 'vitest';

import { VALIDATION_MESSAGES } from './messages';
import { dzMobilePhoneSchema, formatDzMobileForDisplay, normalizeDzMobilePhone } from './phone';

describe('normalizeDzMobilePhone', () => {
  it.each([
    ['0555123456', '+213555123456'],
    ['0661 23 45 67', '+213661234567'],
    ['07.70.12.34.56', '+213770123456'],
    ['+213 555 12 34 56', '+213555123456'],
    ['00213-661-234-567', '+213661234567'],
  ])('normalise %s en %s', (input, expected) => {
    expect(normalizeDzMobilePhone(input)).toBe(expected);
  });

  it.each([
    '',
    '055512345', // trop court
    '05551234567', // trop long
    '0455123456', // préfixe non mobile
    '021123456', // fixe
    '+33612345678', // étranger
    'abcdefghij',
  ])('rejette %j', (input) => {
    expect(normalizeDzMobilePhone(input)).toBeNull();
  });
});

describe('dzMobilePhoneSchema', () => {
  it('retourne le numéro normalisé', () => {
    expect(dzMobilePhoneSchema.parse(' 0555123456 ')).toBe('+213555123456');
  });

  it("retourne une clé de traduction en cas d'erreur", () => {
    const result = dzMobilePhoneSchema.safeParse('123');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES.phoneInvalid);
  });

  it('signale un champ vide comme requis', () => {
    const result = dzMobilePhoneSchema.safeParse('   ');
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES.required);
  });
});

describe('formatDzMobileForDisplay', () => {
  it.each([
    ['+213555123456', '0555 12 34 56'],
    ['+213770001122', '0770 00 11 22'],
    ['autre', 'autre'],
    [null, null],
  ])('%j → %j', (input, expected) => {
    expect(formatDzMobileForDisplay(input)).toBe(expected);
  });
});
