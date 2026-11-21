import { describe, expect, it } from 'vitest';

import {
  approximateDistanceKm,
  formatDzdNumber,
  formatTime,
  initials,
  relativeDay,
} from './format';

// Intl insère parfois des espaces insécables (U+00A0 / U+202F) : on les normalise pour comparer.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatDzdNumber', () => {
  it('formate sans centimes inutiles en français', () => {
    expect(plain(formatDzdNumber(1500, 'fr'))).toBe('1 500');
    expect(plain(formatDzdNumber(250000, 'fr'))).toBe('250 000');
  });

  it('affiche les centimes quand ils existent', () => {
    expect(plain(formatDzdNumber(1500.5, 'fr'))).toBe('1 500,50');
  });

  it('garde les chiffres latins en arabe', () => {
    const value = formatDzdNumber(3000, 'ar');
    expect(value).toMatch(/3/);
    expect(value).not.toMatch(/[٠-٩]/); // pas de chiffres arabes-indiens
  });
});

describe('approximateDistanceKm', () => {
  it.each<[number, number | null]>([
    [0.3, null],
    [1.2, 1],
    [1.3, 1.5],
    [7.74, 7.5],
    [12.4, 12],
    [-1, null],
    [Number.NaN, null],
  ])('%d km → %s', (input, expected) => {
    expect(approximateDistanceKm(input)).toBe(expected);
  });
});

describe('relativeDay', () => {
  const now = new Date(2026, 10, 20, 15, 0);

  it("aujourd'hui → heure", () => {
    expect(relativeDay(new Date(2026, 10, 20, 9, 5), 'fr', now)).toEqual({
      kind: 'today',
      time: formatTime(new Date(2026, 10, 20, 9, 5), 'fr'),
    });
  });

  it('hier', () => {
    expect(relativeDay(new Date(2026, 10, 19, 23, 59), 'fr', now).kind).toBe('yesterday');
  });

  it('date plus ancienne, sans année si même année', () => {
    const result = relativeDay(new Date(2026, 2, 3), 'fr', now);
    expect(result.kind).toBe('date');
    if (result.kind === 'date') expect(result.date).not.toMatch(/2026/);
  });

  it("affiche l'année si différente", () => {
    const result = relativeDay('2025-03-03T10:00:00', 'fr', now);
    if (result.kind === 'date') expect(result.date).toMatch(/2025/);
  });
});

describe('initials', () => {
  it.each([
    ['Karim Benali', 'KB'],
    ['  sofiane ', 'S'],
    ['Amina Bent Ahmed Larbi', 'AL'],
    ['كريم بن علي', 'كع'],
    ['', ''],
  ])('%j → %j', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
