#!/usr/bin/env node
/**
 * KHD-007 — Construit le référentiel géographique et la migration SQL associée.
 *
 *   node scripts/geo/build-geo.mjs --source <dossier du paquet geoalgeria extrait>
 *       lit geoalgeria (noms + codes uniquement), valide, écrit :
 *         supabase/data/geo-dz-2026.json
 *         supabase/migrations/20261121120000_geo_reference_2026.sql
 *   node scripts/geo/build-geo.mjs --check
 *       revalide le JSON versionné et vérifie que la migration correspond (aucun réseau).
 *
 * Aucune opération sur Supabase.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildReference, renderMigration, validateReference } from './lib/geo-reference.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REFERENCE_PATH = join(ROOT, 'supabase/data/geo-dz-2026.json');
export const MIGRATION_PATH = join(
  ROOT,
  'supabase/migrations/20261121120000_geo_reference_2026.sql',
);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sourceLabel = (ref) => `${ref.source.package} ${ref.source.version}`;

function fail(errors) {
  console.error(`✖ ${errors.length} erreur(s) :`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  process.exit(1);
}

function build(sourceDir) {
  const pkg = readJson(join(sourceDir, 'package.json'));
  const wilayas = readJson(join(sourceDir, 'data/wilayas.json')).wilayas;
  const communes = [
    'communes_w1_w23.json',
    'communes_w24_w48.json',
    'communes_w49_w69.json',
  ].flatMap((file) => readJson(join(sourceDir, 'data', file)));
  const ref = buildReference({
    wilayas,
    communes,
    source: {
      package: pkg.name,
      version: pkg.version,
      repository: 'https://github.com/yasserstudio/geoalgeria',
      license:
        'MIT pour la compilation des noms bilingues et des codes administratifs (fichier LICENSE du paquet)',
      fieldsUsed: [
        'wilayas.code',
        'wilayas.name_fr',
        'wilayas.name_ar',
        'wilayas.created',
        'wilayas.mother_wilaya_code',
        'wilayas.capital_commune_code',
        'communes.code_commune',
        'communes.wilaya_code',
        'communes.name_fr',
        'communes.name_ar',
      ],
      fieldsExcluded:
        'coordonnées (en partie ODbL), identifiants OpenStreetMap et Wikidata (ODbL), codes postaux, daïras, données Algérie Poste',
    },
  });
  const errors = validateReference(ref);
  if (errors.length > 0) fail(errors);

  const json = `${JSON.stringify(ref, null, 2)}\n`;
  writeFileSync(REFERENCE_PATH, json);
  writeFileSync(MIGRATION_PATH, renderMigration(ref, { sourceLabel: sourceLabel(ref) }));
  const sha = createHash('sha256').update(json).digest('hex').slice(0, 16);
  console.log(
    `✔ ${ref.wilayas.length} wilayas, ${ref.communes.length} communes (sha256 ${sha}…) → supabase/data/geo-dz-2026.json`,
  );
  console.log('✔ Migration générée → supabase/migrations/20261121120000_geo_reference_2026.sql');
}

function check() {
  const ref = readJson(REFERENCE_PATH);
  const errors = validateReference(ref);
  const expected = renderMigration(ref, { sourceLabel: sourceLabel(ref) });
  const actual = readFileSync(MIGRATION_PATH, 'utf8').replace(/\r\n/g, '\n');
  if (actual !== expected)
    errors.push('la migration ne correspond pas au référentiel : relancer build-geo.mjs');
  if (errors.length > 0) fail(errors);
  console.log(
    `✔ Référentiel valide (${ref.wilayas.length} wilayas, ${ref.communes.length} communes) et migration à jour.`,
  );
}

const args = process.argv.slice(2);
if (args[0] === '--check') check();
else if (args[0] === '--source' && args[1]) build(args[1]);
else {
  console.error('Usage : build-geo.mjs --source <dossier geoalgeria> | --check');
  process.exit(2);
}
