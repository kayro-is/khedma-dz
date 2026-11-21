import { describe, expect, it } from 'vitest';

import {
  isArtisanConfirmed,
  parseStoredSpace,
  resolveSpace,
  spaceStorageKey,
  switchTarget,
  toRolesSnapshot,
  type RolesSnapshot,
} from './spaceState';

const pending: RolesSnapshot = { status: 'pending' };
const failed: RolesSnapshot = { status: 'error' };
const artisan: RolesSnapshot = { status: 'success', isArtisan: true };
const particulierOnly: RolesSnapshot = { status: 'success', isArtisan: false };

describe('parseStoredSpace (préférence locale, sans valeur de sécurité)', () => {
  it.each([
    ['artisan', 'artisan'],
    ['particulier', 'particulier'],
    [null, 'particulier'],
    [undefined, 'particulier'],
    ['ARTISAN', 'particulier'],
    ['admin', 'particulier'],
    ['{"space":"artisan"}', 'particulier'],
  ])('%j → %s', (stored, expected) => {
    expect(parseStoredSpace(stored)).toBe(expected);
  });

  it('isole la préférence de chaque compte', () => {
    expect(spaceStorageKey('a')).not.toBe(spaceStorageKey('b'));
  });
});

describe('resolveSpace', () => {
  it('attend la lecture de la préférence', () => {
    expect(resolveSpace(null, artisan)).toEqual({ kind: 'verifying' });
  });

  it('ouvre l’espace Particulier par défaut, sans attendre le réseau', () => {
    expect(resolveSpace('particulier', pending)).toEqual({ kind: 'ready', space: 'particulier' });
    expect(resolveSpace('particulier', failed)).toEqual({ kind: 'ready', space: 'particulier' });
  });

  it('préférence Artisan : attend la confirmation du rôle par le serveur', () => {
    expect(resolveSpace('artisan', pending)).toEqual({ kind: 'verifying' });
  });

  it('préférence Artisan confirmée par le serveur → espace Artisan', () => {
    expect(resolveSpace('artisan', artisan)).toEqual({ kind: 'ready', space: 'artisan' });
  });

  it('SÉCURITÉ : préférence Artisan modifiée localement sans rôle serveur → espace Particulier', () => {
    expect(resolveSpace('artisan', particulierOnly)).toEqual({
      kind: 'ready',
      space: 'particulier',
    });
  });

  it('préférence Artisan mais serveur injoignable → choix laissé à l’utilisateur, jamais Artisan', () => {
    expect(resolveSpace('artisan', failed)).toEqual({ kind: 'unverified' });
  });
});

describe('toRolesSnapshot', () => {
  it('données reçues → succès, même si un rafraîchissement a échoué ensuite', () => {
    expect(toRolesSnapshot({ data: { isArtisan: true }, isError: true })).toEqual(artisan);
  });
  it('aucune donnée et erreur → erreur', () => {
    expect(toRolesSnapshot({ data: undefined, isError: true })).toEqual(failed);
  });
  it('aucune donnée, pas d’erreur → en cours', () => {
    expect(toRolesSnapshot({ data: undefined, isError: false })).toEqual(pending);
  });
});

describe('switchTarget', () => {
  it('retour en Particulier toujours possible', () => {
    expect(switchTarget('particulier', failed)).toBe('/particulier');
  });
  it('Artisan confirmé → espace Artisan', () => {
    expect(switchTarget('artisan', artisan)).toBe('/artisan');
  });
  it.each([pending, failed, particulierOnly])(
    'Artisan non confirmé (%j) → parcours d’activation, jamais l’espace',
    (roles) => {
      expect(switchTarget('artisan', roles)).toBe('/account/become-artisan');
      expect(isArtisanConfirmed(roles)).toBe(false);
    },
  );
});
