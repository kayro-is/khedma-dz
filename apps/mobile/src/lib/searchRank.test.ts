import { describe, expect, it } from 'vitest';

import { buildSearchIndex, searchIndex, sortByLabel } from './searchRank';

const wilayas = [
  { id: '16', label: '16 · Alger', keywords: 'الجزائر 16' },
  { id: '28', label: "28 · M'Sila", keywords: 'المسيلة 28' },
  { id: '59', label: '59 · Aflou', keywords: 'أفلو 59' },
  { id: '68', label: '68 · Bou Saâda', keywords: 'بوسعادة 68' },
  { id: '13', label: '13 · Tlemcen', keywords: 'تلمسان 13' },
];
const index = buildSearchIndex(wilayas);
const ids = (query: string) => searchIndex(index, query).map((w) => w.id);

describe('searchIndex', () => {
  it('renvoie toute la liste, dans l’ordre, sans saisie', () => {
    expect(ids('  ')).toEqual(['16', '28', '59', '68', '13']);
  });

  it('trouve par nom français, sans accents ni apostrophe', () => {
    expect(ids('msila')).toEqual(['28']);
    expect(ids('saada')).toEqual(['68']);
  });

  it('trouve par nom arabe, avec ou sans hamza, quelle que soit la langue affichée', () => {
    expect(ids('افلو')).toEqual(['59']);
    expect(ids('أفلو')).toEqual(['59']);
    expect(ids('تلمسان')).toEqual(['13']);
  });

  it('trouve par numéro de wilaya', () => {
    expect(ids('59')).toEqual(['59']);
  });

  it('tolère les espaces manquants (« bousaada »)', () => {
    expect(ids('bousaada')).toEqual(['68']);
  });

  it('classe les débuts de mot avant les simples occurrences', () => {
    const communes = buildSearchIndex([
      { label: 'Ain Bouziane' },
      { label: 'Bou Saada' },
      { label: 'Ouled Bouachra' },
    ]);
    expect(searchIndex(communes, 'bou').map((c) => c.label)).toEqual([
      'Bou Saada',
      'Ain Bouziane',
      'Ouled Bouachra',
    ]);
  });

  it('ne renvoie rien pour une recherche sans correspondance', () => {
    expect(ids('zzz')).toEqual([]);
  });
});

describe('sortByLabel', () => {
  it('trie selon la langue, sans tenir compte des accents', () => {
    const sorted = sortByLabel(
      [{ label: 'Él Khroub' }, { label: 'Constantine' }, { label: 'Ain Smara' }],
      'fr',
    );
    expect(sorted.map((c) => c.label)).toEqual(['Ain Smara', 'Constantine', 'Él Khroub']);
  });

  it('trie les noms arabes dans l’ordre alphabétique arabe', () => {
    const sorted = sortByLabel([{ label: 'وهران' }, { label: 'باتنة' }, { label: 'أدرار' }], 'ar');
    expect(sorted.map((c) => c.label)).toEqual(['أدرار', 'باتنة', 'وهران']);
  });
});
