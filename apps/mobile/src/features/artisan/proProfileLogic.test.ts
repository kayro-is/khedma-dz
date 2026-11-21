import { describe, expect, it } from 'vitest';

import ar from '@/i18n/locales/ar.json';
import fr from '@/i18n/locales/fr.json';

import {
  PRO_ERROR_KEYS,
  buildPortfolioPath,
  groupZonesByWilaya,
  isOwnPortfolioPath,
  moveItem,
  planTradeChanges,
  planZoneChanges,
  proErrorKey,
  profileCompletion,
} from './proProfileLogic';

describe('planZoneChanges', () => {
  it('ajoute avant de retirer : un profil publié ne reste jamais sans zone', () => {
    expect(planZoneChanges([1, 2], [2, 3]).steps).toEqual([
      { kind: 'insert', ids: [3] },
      { kind: 'delete', ids: [1] },
    ]);
  });

  it('remplacement complet : toujours au moins une zone pendant la mise à jour', () => {
    const { steps } = planZoneChanges([1], [7, 8]);
    expect(steps).toEqual([
      { kind: 'insert', ids: [7, 8] },
      { kind: 'delete', ids: [1] },
    ]);
  });

  it('près de la limite de 50 : retire d’abord, en gardant une zone jusqu’à la fin', () => {
    const current = Array.from({ length: 50 }, (_, i) => i + 1);
    const next = Array.from({ length: 50 }, (_, i) => i + 101);
    const { steps } = planZoneChanges(current, next);
    expect(steps[0]).toEqual({ kind: 'delete', ids: current.slice(0, 49) });
    expect(steps[1]).toEqual({ kind: 'insert', ids: next });
    expect(steps[2]).toEqual({ kind: 'delete', ids: [50] });
  });

  it('aucun changement → aucune étape', () => {
    expect(planZoneChanges([1, 2], [2, 1]).steps).toEqual([]);
  });
});

describe('planTradeChanges', () => {
  it('nouveau principal : ni réinsertion (faite par le serveur) ni retrait du principal', () => {
    expect(
      planTradeChanges(
        { primaryCategoryId: 'A', serviceIds: ['A', 'B'] },
        { primaryCategoryId: 'C', secondaryCategoryIds: ['B', 'D'] },
      ),
    ).toEqual({ primaryChanged: true, delete: ['A'], insert: ['D'] });
  });

  it('ancien principal conservé comme métier secondaire', () => {
    expect(
      planTradeChanges(
        { primaryCategoryId: 'A', serviceIds: ['A'] },
        { primaryCategoryId: 'B', secondaryCategoryIds: ['A'] },
      ),
    ).toEqual({ primaryChanged: true, delete: [], insert: [] });
  });

  it('métiers secondaires seulement', () => {
    expect(
      planTradeChanges(
        { primaryCategoryId: 'A', serviceIds: ['A', 'B', 'C'] },
        { primaryCategoryId: 'A', secondaryCategoryIds: ['C', 'D'] },
      ),
    ).toEqual({ primaryChanged: false, delete: ['B'], insert: ['D'] });
  });
});

describe('profileCompletion', () => {
  const empty = {
    description: null,
    zonesCount: 1,
    hasAvatar: false,
    portfolioCount: 0,
    yearsExperience: null,
  };

  it('profil minimal : non publiable, 20 %', () => {
    const result = profileCompletion(empty);
    expect(result.canPublish).toBe(false);
    expect(result.percent).toBe(20);
    expect(result.items.filter((i) => i.required).map((i) => i.key)).toEqual([
      'description',
      'zones',
    ]);
  });

  it('obligatoires remplis : publiable même sans les éléments recommandés', () => {
    expect(profileCompletion({ ...empty, description: 'x'.repeat(50) }).canPublish).toBe(true);
  });

  it('profil complet : 100 %', () => {
    expect(
      profileCompletion({
        description: 'x'.repeat(60),
        zonesCount: 3,
        hasAvatar: true,
        portfolioCount: 4,
        yearsExperience: 0,
      }).percent,
    ).toBe(100);
  });
});

describe('galerie', () => {
  it('moveItem déplace d’une position et ignore les déplacements impossibles', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('chemins dans le dossier de l’artisan uniquement', () => {
    const user = '11111111-1111-4111-8111-111111111111';
    expect(buildPortfolioPath(user, 'item', 1)).toBe(`${user}/item/1.jpg`);
    expect(isOwnPortfolioPath(user, `${user}/item/1.jpg`)).toBe(true);
    expect(isOwnPortfolioPath(user, `22222222-2222-4222-8222-222222222222/item/1.jpg`)).toBe(false);
    expect(isOwnPortfolioPath(user, `${user}/../autre/1.jpg`)).toBe(false);
  });
});

describe('groupZonesByWilaya', () => {
  const w16 = { id: 16, code: '16', nameFr: 'Alger', nameAr: 'الجزائر' };
  const w09 = { id: 9, code: '09', nameFr: 'Blida', nameAr: 'البليدة' };
  const zones = [
    { communeId: 1, nameFr: 'Kouba', nameAr: 'القبة', wilaya: w16 },
    { communeId: 2, nameFr: 'Blida', nameAr: 'البليدة', wilaya: w09 },
    { communeId: 3, nameFr: 'Hydra', nameAr: 'حيدرة', wilaya: w16 },
  ];

  it('regroupe par wilaya (ordre des codes) et trie les communes selon la langue', () => {
    const fr = groupZonesByWilaya(zones, 'fr');
    expect(fr.map((g) => `${g.code}:${g.zones.map((z) => z.nameFr).join(',')}`)).toEqual([
      '09:Blida',
      '16:Hydra,Kouba',
    ]);
    const ar = groupZonesByWilaya(zones, 'ar');
    expect(ar[1]?.name).toBe('الجزائر');
    expect(ar[1]?.zones.map((z) => z.nameAr)).toEqual(['القبة', 'حيدرة']);
  });
});

describe('proErrorKey', () => {
  it.each([
    [{ code: 'P0001', hint: 'publish_description' }, 'publishDescription'],
    [{ code: 'P0001', hint: 'publish_zone' }, 'publishZone'],
    [{ code: 'P0001', hint: 'last_zone' }, 'lastZone'],
    [{ code: 'P0001', hint: 'zones_limit' }, 'zonesLimit'],
    [{ code: 'P0001', hint: 'services_limit' }, 'servicesLimit'],
    [{ code: 'P0001', hint: 'primary_service' }, 'primaryService'],
    [{ code: 'P0001', hint: 'portfolio_limit' }, 'portfolioLimit'],
    [{ name: 'AvatarImageError', message: 'avatar_notJpeg' }, 'photoFailed'],
    [new TypeError('Network request failed'), 'network'],
    [{ code: 'PGRST301' }, 'sessionExpired'],
    [{ code: 'XX000' }, 'saveFailed'],
  ])('%j → %s', (error, expected) => {
    expect(proErrorKey(error)).toBe(expected);
  });

  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('toutes les erreurs sont traduites en %s', (_, dict) => {
    const errors = (dict as { pro: { errors: Record<string, string> } }).pro.errors;
    for (const key of PRO_ERROR_KEYS) expect(errors[key], key).toBeTruthy();
  });
});
