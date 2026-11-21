import { describe, expect, it } from 'vitest';

import { DZD_MAX_AMOUNT, dzdAmountSchema } from './money';

describe('dzdAmountSchema', () => {
  it.each([1, 1500, 3000, 2500.5, 199.99, DZD_MAX_AMOUNT])('accepte %d', (value) => {
    expect(dzdAmountSchema.safeParse(value).success).toBe(true);
  });

  it.each([0, -10, 10.001, Number.NaN, Number.POSITIVE_INFINITY, DZD_MAX_AMOUNT + 1])(
    'rejette %d',
    (value) => {
      expect(dzdAmountSchema.safeParse(value).success).toBe(false);
    },
  );

  it('rejette une chaîne de caractères', () => {
    expect(dzdAmountSchema.safeParse('1500').success).toBe(false);
  });
});
