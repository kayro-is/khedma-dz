/**
 * KHD-007 — Référentiel géographique officiel (69 wilayas, 1 541 communes).
 * Logique pure, sans réseau ni base de données : construction, validation et génération SQL.
 * Tests : node --test scripts/
 */

/** Textes officiels applicables (vérifiés sur les PDF du Journal officiel, voir supabase/data/SOURCES.md). */
export const LEGAL_BASIS = Object.freeze({
  wilayaCount: 69,
  communeCount: 1541,
  // Loi n° 26-06 du 4 avril 2026 (JO n° 25 du 5 avril 2026) : articles 52 bis 10 à 52 bis 20.
  // Décret présidentiel n° 26-206 du 25 mai 2026 (JO n° 40 du 3 juin 2026) : numéros 59 à 69.
  newWilayas: Object.freeze([
    { id: 59, nameFr: 'Aflou', motherId: 3, communes: 12 },
    { id: 60, nameFr: 'Barika', motherId: 5, communes: 8 },
    { id: 61, nameFr: 'El Kantara', motherId: 7, communes: 5 },
    { id: 62, nameFr: 'Bir El Ater', motherId: 12, communes: 4 },
    { id: 63, nameFr: 'El Aricha', motherId: 13, communes: 4 },
    { id: 64, nameFr: 'Ksar Chellala', motherId: 14, communes: 6 },
    { id: 65, nameFr: 'Aïn Ouessara', motherId: 17, communes: 10 },
    { id: 66, nameFr: 'Messaad', motherId: 17, communes: 8 },
    { id: 67, nameFr: 'Ksar El Boukhari', motherId: 26, communes: 21 },
    { id: 68, nameFr: 'Bou Saâda', motherId: 28, communes: 23 },
    { id: 69, nameFr: 'El Abiodh Sidi Cheikh', motherId: 32, communes: 7 },
  ]),
  // Wilayas mères redécoupées par la loi n° 26-06 (articles 7 à 36 modifiés) : nombre de communes restant.
  motherWilayaCommunes: Object.freeze({
    3: 12,
    5: 53,
    7: 22,
    12: 24,
    13: 49,
    14: 36,
    17: 18,
    26: 43,
    28: 24,
    32: 15,
  }),
});

/**
 * Corrections documentées appliquées aux données sources (chacune justifiée dans SOURCES.md).
 * Clé = code ONS de la commune.
 */
export const SOURCE_CORRECTIONS = Object.freeze({
  // geoalgeria 2.4.1 : « آفلو ». Décret n° 26-206, version arabe (JO n° 40) : « مدينة أفلو ».
  '0319': { nameAr: 'أفلو' },
  // geoalgeria 2.4.1 : parenthèse non fermée « الحسيان (بني ياحي ». ONS 2021 : « الحسيان ».
  2732: { nameAr: 'الحسيان' },
});

/** Corrections des wilayas, clé = numéro. */
export const WILAYA_CORRECTIONS = Object.freeze({
  // geoalgeria 2.4.1 : « آفلو ». Décret n° 26-206, version arabe (JO n° 40) : « ولاية أفلو ».
  59: { nameAr: 'أفلو' },
});

const ARABIC_LETTER = /[ء-ي]/;
const LATIN_LETTER = /[A-Za-z]/;

export const pad2 = (n) => String(n).padStart(2, '0');
export const pad4 = (n) => String(n).padStart(4, '0');

/** Clé de rapprochement tolérante (comparaison avec les textes officiels). */
export function matchKey(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9ء-ي]+/g, ' ')
    .trim();
}

export const compactKey = (text) => matchKey(text).replace(/ /g, '');

/** Distance d'édition (Levenshtein), pour classer les variantes orthographiques. */
export function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** « identical » | « variant » (orthographe proche) | « different ». */
export function compareNames(a, b) {
  if (matchKey(a) === matchKey(b)) return 'identical';
  const ca = compactKey(a);
  const cb = compactKey(b);
  if (ca === cb) return 'variant';
  const d = editDistance(ca, cb);
  return d <= Math.max(2, Math.floor(Math.min(ca.length, cb.length) / 4)) ? 'variant' : 'different';
}

function lawLabel(created) {
  if (created === 2026) return 'loi 26-06';
  if (created === 2019) return 'loi 19-12';
  return 'loi 84-09';
}

/**
 * Construit le référentiel à partir des fichiers geoalgeria (noms et codes uniquement :
 * aucune coordonnée, aucun identifiant OpenStreetMap, aucune donnée Algérie Poste).
 */
export function buildReference({ wilayas, communes, source }) {
  const outWilayas = wilayas
    .map((w) => ({
      id: w.code,
      code: pad2(w.code),
      nameFr: w.name_fr.trim(),
      nameAr: w.name_ar.trim(),
      legalBasis: lawLabel(w.created),
      motherId: w.mother_wilaya_code ?? null,
      capitalCode: pad4(w.capital_commune_code),
      ...WILAYA_CORRECTIONS[w.code],
    }))
    .sort((a, b) => a.id - b.id);

  const outCommunes = communes
    .map((c) => {
      const code = pad4(c.code_commune);
      return {
        code,
        wilayaId: c.wilaya_code,
        nameFr: c.name_fr.trim(),
        nameAr: c.name_ar.trim(),
        ...SOURCE_CORRECTIONS[code],
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    schemaVersion: 1,
    name: 'Référentiel géographique officiel de l’Algérie (KHD-007)',
    validFrom: '2026-06-03',
    legalBasis: [
      'Loi n° 84-09 du 4 février 1984 relative au découpage territorial du pays, modifiée et complétée',
      'Loi n° 19-12 du 11 décembre 2019 (JO n° 78 du 18 décembre 2019) : wilayas 49 à 58',
      'Loi n° 26-06 du 4 avril 2026 (JO n° 25 du 5 avril 2026) : 69 wilayas, 1 541 communes',
      'Décret présidentiel n° 26-206 du 25 mai 2026 (JO n° 40 du 3 juin 2026) : numéros 59 à 69',
      'ONS, Code géographique national, juin 2021 : codes des communes',
    ],
    source,
    corrections: [
      ...Object.entries(WILAYA_CORRECTIONS).map(([id, fix]) => ({ wilaya: Number(id), ...fix })),
      ...Object.entries(SOURCE_CORRECTIONS).map(([code, fix]) => ({ commune: code, ...fix })),
    ],
    wilayas: outWilayas,
    communes: outCommunes,
  };
}

/** Contrôles d'intégrité. Renvoie la liste des erreurs (vide si le référentiel est valide). */
export function validateReference(ref) {
  const errors = [];
  const err = (message) => errors.push(message);
  const { wilayas, communes } = ref;

  if (wilayas.length !== LEGAL_BASIS.wilayaCount)
    err(`${wilayas.length} wilayas au lieu de ${LEGAL_BASIS.wilayaCount}`);
  if (communes.length !== LEGAL_BASIS.communeCount)
    err(`${communes.length} communes au lieu de ${LEGAL_BASIS.communeCount}`);

  const byId = new Map();
  wilayas.forEach((w, index) => {
    if (w.id !== index + 1) err(`wilaya en position ${index + 1} : numéro ${w.id}`);
    if (w.code !== pad2(w.id)) err(`wilaya ${w.id} : code « ${w.code} »`);
    byId.set(w.id, w);
  });

  const checkNames = (label, nameFr, nameAr) => {
    if (!nameFr || nameFr !== nameFr.trim() || /\s{2,}/.test(nameFr))
      err(`${label} : nom français vide ou mal espacé`);
    if (!nameAr || nameAr !== nameAr.trim() || /\s{2,}/.test(nameAr))
      err(`${label} : nom arabe vide ou mal espacé`);
    if (ARABIC_LETTER.test(nameFr)) err(`${label} : écriture arabe dans le nom français`);
    if (LATIN_LETTER.test(nameAr) || !ARABIC_LETTER.test(nameAr))
      err(`${label} : nom arabe sans écriture arabe ou avec des lettres latines`);
    if (/[()[\]{}]/.test(nameAr) || /[()[\]{}]/.test(nameFr))
      err(`${label} : parenthèses dans un nom`);
  };

  for (const w of wilayas) checkNames(`wilaya ${w.code}`, w.nameFr, w.nameAr);

  for (const expected of LEGAL_BASIS.newWilayas) {
    const w = byId.get(expected.id);
    if (!w) continue;
    if (compareNames(w.nameFr, expected.nameFr) === 'different')
      err(
        `wilaya ${expected.id} : « ${w.nameFr} » au lieu de « ${expected.nameFr} » (décret 26-206)`,
      );
    if (w.motherId !== expected.motherId)
      err(`wilaya ${expected.id} : wilaya mère ${w.motherId} au lieu de ${expected.motherId}`);
  }

  const codes = new Set();
  const perWilaya = new Map();
  const namesPerWilaya = new Map();
  for (const c of communes) {
    const label = `commune ${c.code}`;
    if (!/^\d{4}$/.test(c.code)) err(`${label} : code ONS invalide`);
    if (codes.has(c.code)) err(`${label} : code en double`);
    codes.add(c.code);
    const w = byId.get(c.wilayaId);
    if (!w) {
      err(`${label} : wilaya ${c.wilayaId} inconnue`);
      continue;
    }
    // Code ONS 2021 = wilaya (2 chiffres) + rang : la wilaya actuelle, ou la wilaya mère
    // pour les communes rattachées en 2026 (les codes ONS ne sont pas renumérotés).
    const prefix = Number(c.code.slice(0, 2));
    const expectedPrefix = w.legalBasis === 'loi 26-06' ? w.motherId : w.id;
    if (prefix !== expectedPrefix)
      err(`${label} : préfixe ${pad2(prefix)} incohérent avec la wilaya ${w.code}`);
    checkNames(label, c.nameFr, c.nameAr);
    perWilaya.set(c.wilayaId, (perWilaya.get(c.wilayaId) ?? 0) + 1);
    const names = namesPerWilaya.get(c.wilayaId) ?? new Set();
    const key = matchKey(c.nameFr);
    if (names.has(key)) err(`${label} : nom « ${c.nameFr} » en double dans la wilaya ${w.code}`);
    names.add(key);
    namesPerWilaya.set(c.wilayaId, names);
  }

  for (const w of wilayas) {
    const count = perWilaya.get(w.id) ?? 0;
    if (count === 0) err(`wilaya ${w.code} : aucune commune`);
    const capital = communes.find((c) => c.code === w.capitalCode);
    if (!capital || capital.wilayaId !== w.id)
      err(`wilaya ${w.code} : chef-lieu ${w.capitalCode} absent de la wilaya`);
  }
  for (const expected of LEGAL_BASIS.newWilayas) {
    const count = perWilaya.get(expected.id) ?? 0;
    if (count !== expected.communes)
      err(`wilaya ${expected.id} : ${count} communes au lieu de ${expected.communes} (loi 26-06)`);
  }
  for (const [id, expected] of Object.entries(LEGAL_BASIS.motherWilayaCommunes)) {
    const count = perWilaya.get(Number(id)) ?? 0;
    if (count !== expected)
      err(`wilaya ${pad2(id)} : ${count} communes au lieu de ${expected} (loi 26-06)`);
  }
  return errors;
}

const sqlText = (value) => `'${String(value).replace(/'/g, "''")}'`;

/** Génère la migration SQL idempotente (aucune suppression, identifiants internes conservés). */
export function renderMigration(ref, { sourceLabel }) {
  const wilayaRows = ref.wilayas
    .map((w) => `  (${w.id}, ${sqlText(w.code)}, ${sqlText(w.nameFr)}, ${sqlText(w.nameAr)})`)
    .join(',\n');
  const communeRows = ref.communes
    .map((c) => `  (${sqlText(c.code)}, ${c.wilayaId}, ${sqlText(c.nameFr)}, ${sqlText(c.nameAr)})`)
    .join(',\n');

  return `-- =============================================================================
-- KHD-007 — Référentiel géographique officiel : ${ref.wilayas.length} wilayas, ${ref.communes.length} communes.
-- FICHIER GÉNÉRÉ par scripts/geo/build-geo.mjs depuis supabase/data/geo-dz-2026.json — ne pas modifier à la main.
-- Source des données : ${sourceLabel} (noms et codes uniquement). Sources officielles : supabase/data/SOURCES.md.
--
-- Garanties :
--   * idempotente : peut être rejouée sans créer de doublon ni modifier ce qui est déjà à jour ;
--   * aucune suppression ; les identifiants internes (wilayas.id, communes.id) sont conservés,
--     donc profils, demandes et zones d'intervention restent rattachés aux mêmes communes ;
--   * les coordonnées existantes (centroid) ne sont jamais modifiées ; aucune n'est ajoutée ;
--   * une commune existante sans code officiel est rapprochée par son nom dans sa wilaya
--     (actuelle ou mère) puis complétée, jamais dupliquée ; la migration échoue sinon.
-- =============================================================================

-- 1. Recherche bilingue : la ponctuation (tirets, apostrophes, points) est neutralisée
--    (« Alger-Centre » = « alger centre », « M'Sila » = « msila »). Même règle que
--    normalizeForSearch (apps/mobile/src/i18n/utils.ts).
create or replace function private.normalize_search(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(lower(
    translate(
      regexp_replace(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')),
        '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]', '', 'g'),
      'آأإٱىةؤئ', 'اااايهوي')
  ), '[''’‘\`´]', '', 'g'), '[-‐‑–—.,;:/()_]', ' ', 'g'), '\\s+', ' ', 'g'));
$$;
-- Les index d'expression dépendent de cette fonction : reconstruction.
reindex index public.communes_name_search_idx;
reindex index public.artisan_profiles_name_search_idx;

-- 2. Wilayas (numéro = identifiant interne). Les coordonnées existantes sont conservées.
do $$
begin
  if exists (select 1 from public.wilayas where id between 1 and ${ref.wilayas.length} and code <> lpad(id::text, 2, '0')) then
    raise exception 'KHD-007 : une wilaya existante a un code différent de son numéro';
  end if;
end $$;

insert into public.wilayas as w (id, code, name_fr, name_ar) values
${wilayaRows}
on conflict (id) do update
  set code = excluded.code, name_fr = excluded.name_fr, name_ar = excluded.name_ar
  where (w.code, w.name_fr, w.name_ar) is distinct from (excluded.code, excluded.name_fr, excluded.name_ar);

-- 3. Communes : table de travail (code ONS, wilaya actuelle, noms).
create temporary table khd007_communes (
  official_code text primary key,
  wilaya_id smallint not null,
  name_fr text not null,
  name_ar text not null
);
insert into khd007_communes (official_code, wilaya_id, name_fr, name_ar) values
${communeRows};

-- 3a. Communes existantes sans code (données de démonstration) : rapprochement par nom.
do $$
declare
  v_ambiguous integer;
begin
  select count(*) into v_ambiguous
  from public.communes c
  where c.official_code is null
    and (select count(*) from khd007_communes s
         where c.wilaya_id in (s.wilaya_id, left(s.official_code, 2)::smallint)
           and private.normalize_search(s.name_fr) = private.normalize_search(c.name_fr)) > 1;
  if v_ambiguous > 0 then
    raise exception 'KHD-007 : % commune(s) existante(s) correspondent à plusieurs communes officielles', v_ambiguous;
  end if;
end $$;

update public.communes c
set official_code = s.official_code
from khd007_communes s
where c.official_code is null
  and c.wilaya_id in (s.wilaya_id, left(s.official_code, 2)::smallint)
  and private.normalize_search(s.name_fr) = private.normalize_search(c.name_fr)
  and not exists (select 1 from public.communes o where o.official_code = s.official_code);

-- 3b. Insertion des communes manquantes, mise à jour des noms et du rattachement des autres.
insert into public.communes as c (official_code, wilaya_id, name_fr, name_ar)
select official_code, wilaya_id, name_fr, name_ar from khd007_communes
on conflict (official_code) do update
  set wilaya_id = excluded.wilaya_id, name_fr = excluded.name_fr, name_ar = excluded.name_ar
  where (c.wilaya_id, c.name_fr, c.name_ar) is distinct from (excluded.wilaya_id, excluded.name_fr, excluded.name_ar);

-- 4. Contrôles finaux : la migration est annulée si le résultat n'est pas exact.
do $$
declare
  v_wilayas integer;
  v_communes integer;
  v_uncoded integer;
begin
  select count(*) into v_wilayas from public.wilayas where id between 1 and ${ref.wilayas.length};
  select count(*) into v_communes from public.communes c join khd007_communes s using (official_code)
    where c.wilaya_id = s.wilaya_id and c.name_fr = s.name_fr and c.name_ar = s.name_ar;
  select count(*) into v_uncoded from public.communes where official_code is null;
  if v_wilayas <> ${ref.wilayas.length} or v_communes <> ${ref.communes.length} then
    raise exception 'KHD-007 : % wilayas et % communes conformes (attendu ${ref.wilayas.length} et ${ref.communes.length})', v_wilayas, v_communes;
  end if;
  if v_uncoded > 0 then
    raise exception 'KHD-007 : % commune(s) existante(s) sans correspondance officielle', v_uncoded;
  end if;
end $$;

drop table khd007_communes;
`;
}
