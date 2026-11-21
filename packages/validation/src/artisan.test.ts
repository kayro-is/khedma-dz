import { describe, expect, it } from 'vitest';

import {
  ARTISAN_RULES,
  artisanActivationSchema,
  artisanProfileSchema,
  artisanTradesSchema,
  businessNameSchema,
  portfolioCaptionSchema,
  publicationRequirements,
  yearsExperienceSchema,
} from './artisan';
import { VALIDATION_MESSAGES as M } from './messages';

const issue = (
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) => result.error?.issues.find((i) => i.path[0] === field)?.message;

const valid = {
  businessName: '  Karim   Plomberie ',
  categoryId: 'c0000000-0000-4000-8000-0000000000aa',
  communeId: 1628,
  yearsExperience: '12',
};

describe('artisanActivationSchema', () => {
  it('accepte une activation valide et normalise les valeurs', () => {
    expect(artisanActivationSchema.parse(valid)).toEqual({
      businessName: 'Karim Plomberie',
      categoryId: 'c0000000-0000-4000-8000-0000000000aa',
      communeId: 1628,
      yearsExperience: 12,
    });
  });

  it('accepte un nom d’activité en arabe et une expérience non renseignée', () => {
    const result = artisanActivationSchema.parse({
      ...valid,
      businessName: 'كهرباء الأمين',
      yearsExperience: '',
    });
    expect(result.businessName).toBe('كهرباء الأمين');
    expect(result.yearsExperience).toBeNull();
  });

  it('exige le métier principal et la commune de base', () => {
    const result = artisanActivationSchema.safeParse({
      ...valid,
      categoryId: '',
      communeId: undefined,
    });
    expect(issue(result, 'categoryId')).toBe(M.categoryRequired);
    expect(issue(result, 'communeId')).toBe(M.communeRequired);
  });

  it('refuse un identifiant de métier qui n’est pas un UUID', () => {
    expect(
      issue(artisanActivationSchema.safeParse({ ...valid, categoryId: 'plomberie' }), 'categoryId'),
    ).toBe(M.categoryRequired);
  });
});

describe('businessNameSchema', () => {
  it.each([
    ['', M.required],
    ['   ', M.required],
    ['K', M.businessNameTooShort],
    ['x'.repeat(81), M.businessNameTooLong],
    ['---', M.businessNameInvalid],
    [`Karim${String.fromCharCode(0x200b)}Plomberie`, M.businessNameInvalid],
  ])('« %s » → %s', (input, message) => {
    expect(businessNameSchema.safeParse(input).error?.issues[0]?.message).toBe(message);
  });

  it('accepte 80 caractères après normalisation des espaces', () => {
    expect(businessNameSchema.parse(` ${'a'.repeat(80)}  `)).toHaveLength(80);
  });
});

describe('yearsExperienceSchema', () => {
  it.each([
    ['0', 0],
    ['70', 70],
    [' 5 ', 5],
    ['', null],
    [null, null],
    [undefined, null],
  ])('%j → %j', (input, expected) => {
    expect(yearsExperienceSchema.parse(input)).toBe(expected);
  });

  it.each(['71', '-1', '2.5', 'dix', '100'])('refuse « %s »', (input) => {
    expect(yearsExperienceSchema.safeParse(input).error?.issues[0]?.message).toBe(
      M.yearsExperienceInvalid,
    );
  });
});

describe('artisanProfileSchema (KHD-008)', () => {
  const base = {
    businessName: 'Karim Plomberie',
    description: '  Plombier   chauffagiste.\n\n\n\nInterventions rapides.  ',
    yearsExperience: '12',
    availability: 'AVAILABLE' as const,
    communeId: 1628,
    professionalPhone: '0555 12 34 56',
  };

  it('normalise description et téléphone', () => {
    expect(artisanProfileSchema.parse(base)).toEqual({
      businessName: 'Karim Plomberie',
      description: 'Plombier chauffagiste.\n\nInterventions rapides.',
      yearsExperience: 12,
      availability: 'AVAILABLE',
      communeId: 1628,
      professionalPhone: '+213555123456',
    });
  });

  it('champs facultatifs vides → null', () => {
    const result = artisanProfileSchema.parse({
      ...base,
      description: '   ',
      professionalPhone: '',
    });
    expect(result.description).toBeNull();
    expect(result.professionalPhone).toBeNull();
  });

  it('refuse une description trop longue, un téléphone invalide, une disponibilité inconnue', () => {
    const result = artisanProfileSchema.safeParse({
      ...base,
      description: 'x'.repeat(ARTISAN_RULES.descriptionMax + 1),
      professionalPhone: '0212 34 56 78',
      availability: 'HOLIDAY',
    });
    expect(issue(result, 'description')).toBe(M.descriptionTooLong);
    expect(issue(result, 'professionalPhone')).toBe(M.phoneInvalid);
    expect(issue(result, 'availability')).toBeTruthy();
  });
});

describe('artisanTradesSchema', () => {
  const A = 'c0000000-0000-4000-8000-0000000000a1';
  const ids = (n: number) =>
    Array.from({ length: n }, (_, i) => `c0000000-0000-4000-8000-00000000010${i}`);

  it('retire le métier principal et les doublons des métiers secondaires', () => {
    const [b, c] = ids(2);
    expect(
      artisanTradesSchema.parse({ primaryCategoryId: A, secondaryCategoryIds: [b, A, b, c] }),
    ).toEqual({ primaryCategoryId: A, secondaryCategoryIds: [b, c] });
  });

  it('5 métiers secondaires au maximum', () => {
    expect(
      artisanTradesSchema.safeParse({ primaryCategoryId: A, secondaryCategoryIds: ids(6) }).error
        ?.issues[0]?.message,
    ).toBe(M.tradesTooMany);
    expect(
      artisanTradesSchema.safeParse({ primaryCategoryId: A, secondaryCategoryIds: ids(5) }).success,
    ).toBe(true);
  });

  it('exige un métier principal', () => {
    expect(
      artisanTradesSchema.safeParse({ primaryCategoryId: '', secondaryCategoryIds: [] }).error
        ?.issues[0]?.message,
    ).toBe(M.categoryRequired);
  });
});

describe('portfolioCaptionSchema', () => {
  it.each([
    ['', null],
    ['   ', null],
    [null, null],
    ['  Salle de bain  ', 'Salle de bain'],
    ['مطبخ عصري', 'مطبخ عصري'],
  ])('%j → %j', (input, expected) => {
    expect(portfolioCaptionSchema.parse(input)).toBe(expected);
  });

  it('100 caractères au maximum', () => {
    expect(portfolioCaptionSchema.safeParse('x'.repeat(101)).error?.issues[0]?.message).toBe(
      M.captionTooLong,
    );
  });
});

describe('publicationRequirements (mêmes règles que le serveur)', () => {
  it.each([
    [{ description: null, zonesCount: 1 }, false],
    [{ description: 'x'.repeat(49), zonesCount: 1 }, false],
    [{ description: `  ${'x'.repeat(50)}  `, zonesCount: 1 }, true],
    [{ description: 'x'.repeat(50), zonesCount: 0 }, false],
  ])('%j → publiable : %s', (input, expected) => {
    expect(publicationRequirements(input).canPublish).toBe(expected);
  });
});
