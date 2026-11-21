// Exécution : node --test scripts/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  buildReference,
  compareNames,
  LEGAL_BASIS,
  matchKey,
  renderMigration,
  validateReference,
} from './geo-reference.mjs';

const REFERENCE = JSON.parse(
  readFileSync(new URL('../../../supabase/data/geo-dz-2026.json', import.meta.url), 'utf8'),
);
const MIGRATION = readFileSync(
  new URL('../../../supabase/migrations/20261121120000_geo_reference_2026.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const clone = () => structuredClone(REFERENCE);

test('le référentiel versionné est valide : 69 wilayas, 1 541 communes', () => {
  assert.deepEqual(validateReference(REFERENCE), []);
  assert.equal(REFERENCE.wilayas.length, LEGAL_BASIS.wilayaCount);
  assert.equal(REFERENCE.communes.length, LEGAL_BASIS.communeCount);
});

test('la migration versionnée correspond exactement au référentiel (fichier généré)', () => {
  const expected = renderMigration(REFERENCE, {
    sourceLabel: `${REFERENCE.source.package} ${REFERENCE.source.version}`,
  });
  assert.equal(MIGRATION, expected);
});

test('les 11 wilayas créées en 2026 portent les numéros du décret 26-206', () => {
  for (const expected of LEGAL_BASIS.newWilayas) {
    const w = REFERENCE.wilayas.find((x) => x.id === expected.id);
    assert.equal(compareNames(w.nameFr, expected.nameFr) !== 'different', true, expected.nameFr);
    assert.equal(w.legalBasis, 'loi 26-06');
  }
  assert.equal(REFERENCE.wilayas.find((w) => w.id === 59).nameAr, 'أفلو');
});

test('le référentiel ne contient ni coordonnées ni données sous licence ODbL ou Algérie Poste', () => {
  const keys = new Set([
    ...REFERENCE.wilayas.flatMap(Object.keys),
    ...REFERENCE.communes.flatMap(Object.keys),
  ]);
  for (const forbidden of ['latitude', 'longitude', 'osm_relation_id', 'wikidata', 'postal_code'])
    assert.equal(keys.has(forbidden), false, forbidden);
});

test('détecte un effectif incorrect', () => {
  const ref = clone();
  ref.communes.pop();
  assert.match(validateReference(ref).join('\n'), /1540 communes au lieu de 1541/);
});

test('détecte un code ONS en double ou invalide', () => {
  const ref = clone();
  ref.communes[1].code = ref.communes[0].code;
  ref.communes[2].code = '12A4';
  const errors = validateReference(ref).join('\n');
  assert.match(errors, /code en double/);
  assert.match(errors, /code ONS invalide/);
});

test('détecte un nom arabe absent, en lettres latines ou mal formé', () => {
  const ref = clone();
  ref.communes[0].nameAr = 'Adrar';
  ref.communes[1].nameAr = '';
  ref.communes[2].nameAr = 'الحسيان (بني ياحي';
  const errors = validateReference(ref).join('\n');
  assert.match(errors, /sans écriture arabe ou avec des lettres latines/);
  assert.match(errors, /nom arabe vide/);
  assert.match(errors, /parenthèses/);
});

test('détecte une commune rattachée à une wilaya incohérente avec son code ONS', () => {
  const ref = clone();
  const aflou = ref.communes.find((c) => c.code === '0319');
  aflou.wilayaId = 5; // code 03xx dans Batna
  const errors = validateReference(ref).join('\n');
  assert.match(errors, /préfixe 03 incohérent avec la wilaya 05/);
  assert.match(errors, /wilaya 59 : 11 communes au lieu de 12/);
});

test('détecte un doublon de nom dans une même wilaya', () => {
  const ref = clone();
  const [a, b] = ref.communes.filter((c) => c.wilayaId === 16);
  b.nameFr = `${a.nameFr.toUpperCase()}`;
  assert.match(validateReference(ref).join('\n'), /en double dans la wilaya 16/);
});

test('détecte un mauvais numéro de wilaya mère', () => {
  const ref = clone();
  ref.wilayas.find((w) => w.id === 66).motherId = 26;
  assert.match(validateReference(ref).join('\n'), /wilaya 66 : wilaya mère 26 au lieu de 17/);
});

test('buildReference ne garde que noms et codes, et applique les corrections documentées', () => {
  const ref = buildReference({
    wilayas: [
      {
        code: 3,
        name_fr: 'Laghouat',
        name_ar: 'الأغواط',
        created: 1984,
        capital_commune_code: 301,
      },
      {
        code: 59,
        name_fr: 'Aflou',
        name_ar: 'آفلو',
        created: 2026,
        mother_wilaya_code: 3,
        capital_commune_code: 319,
      },
    ],
    communes: [
      {
        code_commune: 319,
        wilaya_code: 59,
        name_fr: 'Aflou',
        name_ar: 'آفلو',
        latitude: 34.1,
        postal_code: '03001',
      },
      {
        code_commune: 301,
        wilaya_code: 3,
        name_fr: ' Laghouat ',
        name_ar: 'الأغواط',
        osm_relation_id: 1,
      },
    ],
    source: { package: 'geoalgeria', version: 'test' },
  });
  assert.deepEqual(ref.communes, [
    { code: '0301', wilayaId: 3, nameFr: 'Laghouat', nameAr: 'الأغواط' },
    { code: '0319', wilayaId: 59, nameFr: 'Aflou', nameAr: 'أفلو' },
  ]);
  assert.equal(ref.wilayas[1].nameAr, 'أفلو');
  assert.equal(ref.wilayas[1].legalBasis, 'loi 26-06');
  assert.equal(ref.wilayas[0].code, '03');
});

test('migration : idempotente, sans suppression et sans écriture de coordonnées', () => {
  assert.match(MIGRATION, /on conflict \(id\) do update/);
  assert.match(MIGRATION, /on conflict \(official_code\) do update/);
  assert.match(MIGRATION, /is distinct from/);
  assert.doesNotMatch(MIGRATION, /\bdelete\s+from\b|\btruncate\b|\bdrop\s+table\s+public\./i);
  assert.doesNotMatch(MIGRATION, /set[^;]*\bcentroid\s*=/i);
  assert.match(MIGRATION, /sans correspondance officielle/);
});

test('migration : apostrophes des noms correctement échappées', () => {
  assert.match(MIGRATION, /'M''Sila'/);
});

test('matchKey et compareNames tolèrent accents, ponctuation et variantes arabes', () => {
  assert.equal(matchKey('Aïn Ouessara'), 'ain ouessara');
  assert.equal(matchKey('Hassi R’Mel'), matchKey("Hassi R'Mel"));
  assert.equal(matchKey('آفلو'), matchKey('أفلو'));
  assert.equal(compareNames('Alger-Centre', 'Alger Centre'), 'identical');
  assert.equal(compareNames('ElAricha', 'El Aricha'), 'variant');
  assert.equal(compareNames('Oum El Bouaghi', 'Oum El Bouagui'), 'variant');
  assert.equal(compareNames('Tamenghasset', 'Tamanrasset'), 'different'); // signalée « à examiner »
  assert.equal(compareNames('Oran', 'Tlemcen'), 'different');
});
