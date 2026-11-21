// Exécution : node --test scripts/
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleToWilaya, pairNames, parseDecree, parseLaw, parseOns } from './official-texts.mjs';

test('articleToWilaya : articles de la loi n° 84-09 vers numéros de wilaya', () => {
  assert.equal(articleToWilaya('7'), 3);
  assert.equal(articleToWilaya('36'), 32);
  assert.equal(articleToWilaya('52 bis 10'), 59);
  assert.equal(articleToWilaya('52. Bis 20'), 69);
});

test('parseLaw : totaux et listes, en ignorant les en-têtes de page', () => {
  const text = [
    '« Art. 3. — Le nouveau découpage territorial du pays',
    'comprend soixante-neuf (69) wilayas et mille cinq cent',
    'quarante-et-une (1541) communes. ».',
    '« Art. 52 bis 12. — Les cinq (5) communes suivantes constituent',
    'une wilaya :',
    '1. El Kantara ;',
    '2. Aïn Zaatout ;',
    '17 Chaoual 1447 JOURNAL OFFICIEL DE LA REPUBLIQUE ALGERIENNE N° 25 9',
    '5 avril 2026',
    '3. Branis ;',
    '4. El Outaya ;',
    '5. Djemourah. ».',
    'Art. 4. — Les dispositions des articles 54',
  ].join('\n');
  const law = parseLaw(text);
  assert.deepEqual(law.totals, { wilayas: 69, communes: 1541 });
  assert.equal(law.wilayas.length, 1);
  assert.deepEqual(law.wilayas[0], {
    article: '52 bis 12',
    wilayaId: 61,
    declared: 5,
    communes: ['El Kantara', 'Aïn Zaatout', 'Branis', 'El Outaya', 'Djemourah'],
  });
});

test('parseDecree : numéros, noms et chefs-lieux, y compris sur deux lignes', () => {
  const text = [
    "59- Wilaya d'Aflou avec chef-lieu la ville d'Aflou ;",
    '62- Wilaya de Bir El Ater avec chef-lieu la ville de Bir',
    'El Ater ;',
    "69- Wilaya d'El Abiodh Sidi Cheikh avec chef-lieu la ville",
    "d'El Abiodh Sidi Cheikh.",
  ].join('\n');
  assert.deepEqual(parseDecree(text), [
    { id: 59, nameFr: 'Aflou', capital: 'Aflou' },
    { id: 62, nameFr: 'Bir El Ater', capital: 'Bir El Ater' },
    { id: 69, nameFr: 'El Abiodh Sidi Cheikh', capital: 'El Abiodh Sidi Cheikh' },
  ]);
});

test('parseOns : codes, arabe remis dans l’ordre logique, graphies coupées ignorées', () => {
  const text = [
    'ADRAR 01 راردأ',
    'Commune W. C. ةـيدلبلا',
    'ADRAR 01 01 راردأ',
    'TAMEST 01 02 ت',
    'ا',
    'تسام',
    'OULED AHMED TIMMI 01 21 ىميت دمحأ دالوأ',
  ].join('\n');
  const ons = parseOns(text);
  assert.deepEqual(ons.communes, [
    { code: '0101', nameFr: 'ADRAR', nameAr: 'أدرار' },
    { code: '0102', nameFr: 'TAMEST', nameAr: null },
    { code: '0121', nameFr: 'OULED AHMED TIMMI', nameAr: 'أولاد أحمد تيمى' },
  ]);
  assert.deepEqual(ons.wilayas, [{ id: 1, nameFr: 'ADRAR', nameAr: 'أدرار' }]);
});

test('pairNames : identiques, variantes orthographiques et noms sans correspondance', () => {
  const dataset = [
    { code: '1', nameFr: 'Alger Centre' },
    { code: '2', nameFr: 'Oum El Bouagui' },
    { code: '3', nameFr: 'Kouba' },
  ];
  const result = pairNames(['Alger-Centre', 'Oum El Bouaghi', 'Inconnue'], dataset);
  assert.deepEqual(
    result.pairs.map((p) => [p.official, p.dataset.code, p.kind]),
    [
      ['Alger-Centre', '1', 'identical'],
      ['Oum El Bouaghi', '2', 'variant'],
    ],
  );
  assert.deepEqual(result.unmatched, ['Inconnue']);
  assert.deepEqual(result.extra, [{ code: '3', nameFr: 'Kouba' }]);
});
