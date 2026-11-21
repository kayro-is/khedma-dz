import { describe, expect, it } from 'vitest';

import { VALIDATION_MESSAGES as M } from './messages';
import { changePasswordSchema, deleteAccountSchema, profileUpdateSchema } from './profile';

const issue = (
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) => result.error?.issues.find((i) => i.path[0] === field)?.message;

describe('profileUpdateSchema', () => {
  const valid = {
    firstName: ' Amina ',
    lastName: 'Belkacem',
    phone: '0661 23 45 67',
    communeId: 3,
  };

  it('normalise noms et téléphone', () => {
    expect(profileUpdateSchema.parse(valid)).toEqual({
      firstName: 'Amina',
      lastName: 'Belkacem',
      phone: '+213661234567',
      communeId: 3,
    });
  });

  it('accepte une commune non renseignée', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, communeId: null }).success).toBe(true);
  });

  it.each([0, -1, 2.5])('refuse un identifiant de commune invalide (%d)', (communeId) => {
    expect(issue(profileUpdateSchema.safeParse({ ...valid, communeId }), 'communeId')).toBe(
      M.communeInvalid,
    );
  });

  it('refuse un numéro non mobile', () => {
    expect(issue(profileUpdateSchema.safeParse({ ...valid, phone: '021 12 34 56' }), 'phone')).toBe(
      M.phoneInvalid,
    );
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'Ancien2026',
    newPassword: 'Nouveau2026',
    confirmPassword: 'Nouveau2026',
  };

  it('accepte un changement valide', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('exige le mot de passe actuel', () => {
    expect(
      issue(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }), 'currentPassword'),
    ).toBe(M.required);
  });

  it('refuse un nouveau mot de passe identique à l’actuel', () => {
    const same = {
      currentPassword: 'Nouveau2026',
      newPassword: 'Nouveau2026',
      confirmPassword: 'Nouveau2026',
    };
    expect(issue(changePasswordSchema.safeParse(same), 'newPassword')).toBe(
      M.passwordSameAsCurrent,
    );
  });

  it('applique les règles de robustesse', () => {
    expect(
      issue(
        changePasswordSchema.safeParse({
          ...valid,
          newPassword: 'faible',
          confirmPassword: 'faible',
        }),
        'newPassword',
      ),
    ).toBe(M.passwordTooShort);
  });

  it('exige la confirmation', () => {
    expect(
      issue(
        changePasswordSchema.safeParse({ ...valid, confirmPassword: 'Autre2026' }),
        'confirmPassword',
      ),
    ).toBe(M.passwordsMismatch);
  });
});

describe('deleteAccountSchema', () => {
  const schema = deleteAccountSchema('Amina@Khedma.test');

  it('accepte l’adresse ressaisie (casse et espaces ignorés)', () => {
    expect(schema.safeParse({ confirmation: ' amina@khedma.TEST ' }).success).toBe(true);
  });

  it('refuse une autre saisie', () => {
    expect(issue(schema.safeParse({ confirmation: 'oui' }), 'confirmation')).toBe(
      M.deleteConfirmationMismatch,
    );
  });
});
