#!/usr/bin/env node
/**
 * KHD-007 — Test LOCAL de la migration du référentiel, sans Supabase.
 *
 *   node scripts/geo/test-migration-local.mjs
 *
 * Démarre un PostgreSQL jetable (binaires locaux, dossier temporaire, port 54329), reproduit
 * l'état actuel du projet de TEST (3 wilayas et 9 communes de démonstration, sans code officiel,
 * référencées par d'autres tables), puis vérifie :
 *   1. application de la migration ; 2. identifiants internes, coordonnées et relations conservés ;
 *   3. idempotence (seconde exécution sans aucune ligne modifiée) ; 4. base vide (production) ;
 *   5. échec atomique si une commune existante ne correspond à aucune commune officielle ;
 *   6. normalisation de recherche identique à celle de l'application (cas partagés).
 * Les tables sont recopiées des migrations ; PostGIS étant absent en local, centroid devient du texte.
 * Variable optionnelle : PG_BIN (dossier des binaires PostgreSQL).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const GEO_MIGRATION = join(MIGRATIONS, '20261121120000_geo_reference_2026.sql');
const SEARCH_CASES = JSON.parse(
  readFileSync(join(ROOT, 'supabase/tests/fixtures/search-normalization.json'), 'utf8'),
);
const PORT = '54329';

const exe = process.platform === 'win32' ? '.exe' : '';
const candidates = [
  process.env.PG_BIN,
  'C:/Program Files/PostgreSQL/18/bin',
  'C:/Program Files/PostgreSQL/17/bin',
  '/usr/lib/postgresql/18/bin',
  '/usr/lib/postgresql/17/bin',
].filter(Boolean);
const PG_BIN = candidates.find((dir) => existsSync(join(dir, `initdb${exe}`)));
if (!PG_BIN) {
  console.log('⚠ Binaires PostgreSQL introuvables (définir PG_BIN) : test local ignoré.');
  process.exit(0);
}
const bin = (name) => join(PG_BIN, `${name}${exe}`);

let passed = 0;
const failures = [];
function check(label, condition) {
  if (condition) passed++;
  else failures.push(label);
  console.log(`${condition ? '  ✔' : '  ✖'} ${label}`);
}

// --- Schéma minimal, recopié des migrations existantes -------------------------------------------
const read = (file) => readFileSync(join(MIGRATIONS, file), 'utf8');
const foundations = read('20261120090000_foundations.sql');
const geography = read('20261120090200_geography_categories_artisans.sql');
const extract = (source, re, label) => {
  const m = re.exec(source);
  if (!m) throw new Error(`Extraction impossible : ${label}`);
  return m[0];
};
const schemaSql = [
  'create schema extensions;',
  'create extension unaccent with schema extensions;',
  'create extension pg_trgm with schema extensions;',
  'create schema private;',
  extract(
    foundations,
    /create or replace function private\.normalize_search[\s\S]*?\$\$;/,
    'normalize_search',
  ),
  extract(geography, /create table public\.wilayas \([\s\S]*?\n\);/, 'wilayas'),
  extract(geography, /create table public\.communes \([\s\S]*?\n\);/, 'communes'),
  extract(geography, /create index communes_wilaya_idx[^;]*;/, 'communes_wilaya_idx'),
  extract(geography, /create index communes_name_search_idx[^;]*;/, 'communes_name_search_idx'),
  // Tables dépendantes simplifiées : mêmes clés étrangères vers communes que dans le schéma réel.
  'create table public.artisan_profiles (user_id int primary key, business_name text, base_commune_id integer references public.communes (id));',
  extract(
    geography,
    /create index artisan_profiles_name_search_idx[^;]*;/,
    'artisan_profiles_name_search_idx',
  ),
  'create table public.profile_private (user_id int primary key, commune_id integer references public.communes (id) on delete set null);',
  'create table public.service_requests (id int primary key, commune_id integer not null references public.communes (id) on delete restrict);',
]
  .join('\n')
  .replace(/extensions\.geography\(point, 4326\)/g, 'text');

// État actuel du projet de TEST (seed d'origine) : 3 wilayas, 9 communes sans code officiel.
const testStateSql = `
insert into public.wilayas (id, code, name_fr, name_ar, centroid) values
  (16, '16', 'Alger', 'الجزائر', 'SRID=4326;POINT(3.06 36.75)'),
  (25, '25', 'Constantine', 'قسنطينة', 'SRID=4326;POINT(6.61 36.37)'),
  (31, '31', 'Oran', 'وهران', 'SRID=4326;POINT(-0.63 35.70)');
insert into public.communes (wilaya_id, name_fr, name_ar, centroid) values
  (16, 'Alger-Centre', 'الجزائر الوسطى', 'SRID=4326;POINT(3.06 36.77)'),
  (16, 'Bab El Oued', 'باب الوادي', 'SRID=4326;POINT(3.05 36.79)'),
  (16, 'Hydra', 'حيدرة', 'SRID=4326;POINT(3.03 36.74)'),
  (16, 'Kouba', 'القبة', 'SRID=4326;POINT(3.08 36.72)'),
  (25, 'Constantine', 'قسنطينة', 'SRID=4326;POINT(6.61 36.37)'),
  (25, 'El Khroub', 'الخروب', 'SRID=4326;POINT(6.69 36.26)'),
  (31, 'Oran', 'وهران', 'SRID=4326;POINT(-0.63 35.70)'),
  (31, 'Bir El Djir', 'بئر الجير', 'SRID=4326;POINT(-0.55 35.72)'),
  (31, 'Es Senia', 'السانية', 'SRID=4326;POINT(-0.62 35.65)');
insert into public.profile_private values (1, (select id from public.communes where name_fr = 'Hydra'));
insert into public.service_requests values (1, (select id from public.communes where name_fr = 'Alger-Centre'));
insert into public.artisan_profiles values (1, 'Plomberie Karim', (select id from public.communes where name_fr = 'Es Senia'));
create table public.before_import as
  select id, wilaya_id, name_fr, centroid from public.communes;
`;

// --- Serveur jetable ------------------------------------------------------------------------------
const dataDir = mkdtempSync(join(tmpdir(), 'khedma-geo-pg-'));
const logFile = join(dataDir, 'server.log');
const pgdata = join(dataDir, 'data');

// Le SQL passe par l'entrée standard (UTF-8) : la ligne de commande Windows altère les accents.
function psql(db, args, { allowFailure = false, input } = {}) {
  const r = spawnSync(
    bin('psql'),
    [
      '-h',
      'localhost',
      '-p',
      PORT,
      '-U',
      'postgres',
      '-d',
      db,
      '-X',
      '-q',
      '-v',
      'ON_ERROR_STOP=1',
      ...args,
    ],
    { encoding: 'utf8', input, env: { ...process.env, PGCLIENTENCODING: 'UTF8' } },
  );
  if (r.status !== 0 && !allowFailure) throw new Error(`psql a échoué :\n${r.stderr}`);
  return r;
}
const sql = (db, text, opts) => psql(db, ['-f', '-'], { ...opts, input: text });
const value = (db, query) => psql(db, ['-A', '-t', '-f', '-'], { input: query }).stdout.trim();
const applyMigration = (db, opts) => psql(db, ['-1', '-f', GEO_MIGRATION], opts);
const snapshot = (db) =>
  value(
    db,
    `select md5(string_agg(concat_ws('|', xmin, id, wilaya_id, official_code, name_fr, name_ar, centroid), ',' order by id)) from public.communes;
     `,
  ) +
  value(
    db,
    `select md5(string_agg(concat_ws('|', xmin, id, code, name_fr, name_ar, centroid), ',' order by id)) from public.wilayas;`,
  );

function createDb(name, withTestState) {
  sql('postgres', `create database ${name} encoding 'UTF8' template template0;`);
  sql(name, schemaSql);
  if (withTestState) sql(name, testStateSql);
}

try {
  execFileSync(
    bin('initdb'),
    ['-D', pgdata, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'],
    {
      stdio: 'ignore',
    },
  );
  execFileSync(
    bin('pg_ctl'),
    ['-D', pgdata, '-l', logFile, '-o', `-p ${PORT} -c listen_addresses=localhost`, '-w', 'start'],
    { stdio: 'ignore' },
  );
  console.log(`PostgreSQL local jetable démarré (${PG_BIN}, port ${PORT}).`);

  // 1-3. Base reproduisant le projet de TEST.
  console.log('\n[1] Migration sur une copie de l’état actuel du projet de TEST');
  createDb('khd_test_state', true);
  applyMigration('khd_test_state');
  const db = 'khd_test_state';
  check(
    '69 wilayas (numéros 1 à 69)',
    value(db, 'select count(*) from public.wilayas where id between 1 and 69') === '69',
  );
  check(
    '1 541 communes, toutes avec un code officiel unique',
    value(db, 'select count(distinct official_code) from public.communes') === '1541' &&
      value(db, 'select count(*) from public.communes') === '1541',
  );
  check(
    'les 11 nouvelles wilayas ont le bon nombre de communes',
    value(
      db,
      `select string_agg(wilaya_id || ':' || n, ',' order by wilaya_id) from (select wilaya_id, count(*) n from public.communes where wilaya_id >= 59 group by wilaya_id) t`,
    ) === '59:12,60:8,61:5,62:4,63:4,64:6,65:10,66:8,67:21,68:23,69:7',
  );

  console.log('\n[2] Identifiants internes, coordonnées et relations');
  check(
    'les 9 communes de démonstration gardent leur identifiant interne',
    value(
      db,
      'select count(*) from public.before_import b join public.communes c using (id) where c.wilaya_id = b.wilaya_id',
    ) === '9',
  );
  check(
    'codes officiels attribués aux communes de démonstration',
    value(
      db,
      `select string_agg(official_code, ',' order by id) from public.communes where id in (select id from public.before_import)`,
    ) === '1601,1605,1628,1618,2501,2506,3101,3103,3105',
  );
  check(
    '« Alger-Centre » renommée selon le référentiel (« Alger Centre »)',
    value(db, `select name_fr from public.communes where official_code = '1601'`) ===
      'Alger Centre',
  );
  check(
    'coordonnées des 9 communes inchangées',
    value(
      db,
      'select count(*) from public.before_import b join public.communes c using (id) where c.centroid = b.centroid',
    ) === '9',
  );
  check(
    'aucune coordonnée inventée (seules les 9 communes en ont)',
    value(db, 'select count(*) from public.communes where centroid is not null') === '9',
  );
  check(
    'coordonnées des 3 wilayas de démonstration inchangées, aucune ajoutée',
    value(db, 'select count(*) from public.wilayas where centroid is not null') === '3',
  );
  check(
    'profil, demande et artisan pointent toujours sur la même commune',
    value(
      db,
      `select string_agg(c.official_code, ',') from (select commune_id id from public.profile_private union all select commune_id from public.service_requests union all select base_commune_id from public.artisan_profiles) r join public.communes c using (id)`,
    ) === '1628,1601,3105',
  );

  console.log('\n[3] Idempotence');
  const before = snapshot(db);
  applyMigration(db);
  check('seconde exécution : aucune ligne modifiée ni ajoutée', snapshot(db) === before);

  // 4. Base vide (cas du projet de production).
  console.log('\n[4] Base vide (cas du projet de production)');
  createDb('khd_empty', false);
  applyMigration('khd_empty');
  check(
    '69 wilayas et 1 541 communes importées',
    value('khd_empty', 'select count(*) from public.wilayas') === '69' &&
      value('khd_empty', 'select count(*) from public.communes') === '1541',
  );
  check(
    'wilaya 59 : « Aflou » / « أفلو » (décret 26-206)',
    value('khd_empty', "select name_fr || ' / ' || name_ar from public.wilayas where id = 59") ===
      'Aflou / أفلو',
  );
  // Section géographique du seed de démonstration (projet de TEST, base neuve).
  const seed = readFileSync(join(ROOT, 'supabase/seed.sql'), 'utf8');
  const seedGeo = extract(
    seed,
    /update public\.wilayas w set centroid[\s\S]*?where c\.official_code = v\.official_code;/,
    'seed géographie',
  ).replace(/::extensions\.geography/g, '');
  sql('khd_empty', seedGeo);
  check(
    'seed : coordonnées des 9 communes de démonstration retrouvées par code officiel',
    value('khd_empty', 'select count(*) from public.communes where centroid is not null') === '9' &&
      value('khd_empty', 'select count(*) from public.wilayas where centroid is not null') === '3',
  );

  // 5. Échec atomique.
  console.log('\n[5] Commune existante sans correspondance officielle');
  createDb('khd_conflict', true);
  sql(
    'khd_conflict',
    `insert into public.communes (wilaya_id, name_fr, name_ar) values (16, 'Commune inventée', 'بلدية');`,
  );
  const r = applyMigration('khd_conflict', { allowFailure: true });
  check(
    'la migration est refusée avec un message explicite',
    r.status !== 0 && /sans correspondance officielle/.test(r.stderr),
  );
  check(
    'rien n’est modifié (transaction annulée)',
    value('khd_conflict', 'select count(*) from public.communes') === '10' &&
      value('khd_conflict', 'select count(*) from public.wilayas') === '3',
  );

  // 6. Normalisation de recherche.
  console.log('\n[6] Normalisation de recherche (cas partagés avec l’application)');
  for (const [input, expected] of SEARCH_CASES) {
    const literal = `'${input.replace(/'/g, "''")}'`;
    check(
      `« ${input} » → « ${expected} »`,
      value(db, `select private.normalize_search(${literal})`) === expected,
    );
  }
  check(
    'recherche « msila » : trouve M’Sila',
    value(
      db,
      `select count(*) from public.communes where private.normalize_search(name_fr) = private.normalize_search('msila')`,
    ) === '1',
  );
  check(
    'recherche « الاغواط » : trouve الأغواط',
    value(
      db,
      `select count(*) from public.communes where private.normalize_search(name_ar) = private.normalize_search('الاغواط')`,
    ) === '1',
  );
} catch (error) {
  failures.push(String(error.message ?? error));
  console.error(error.message ?? error);
} finally {
  spawnSync(bin('pg_ctl'), ['-D', pgdata, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' });
  rmSync(dataDir, { recursive: true, force: true });
}

console.log(
  `\n${failures.length === 0 ? '✔' : '✖'} ${passed} contrôle(s) réussi(s), ${failures.length} échec(s).`,
);
process.exit(failures.length === 0 ? 0 : 1);
