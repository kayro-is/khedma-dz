#!/usr/bin/env node
/**
 * KHD-007 — Contrôle croisé du référentiel avec les textes officiels (PDF téléchargés localement).
 *
 *   node scripts/geo/crosscheck-official.mjs --law F2026025.pdf --decree F2026040.pdf --ons code_geo_2021.pdf
 *
 * Sources (voir supabase/data/SOURCES.md) :
 *   --law     https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf   (loi n° 26-06)
 *   --decree  https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf   (décret n° 26-206)
 *   --ons     https://www.ons.dz/IMG/pdf/code_geo_2021.pdf               (code géographique national)
 * Nécessite pdftotext (Poppler, fourni avec Git pour Windows). Écrit supabase/data/geo-crosscheck.md.
 * Lecture seule : aucune opération sur Supabase.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compactKey, compareNames, editDistance, matchKey, pad2 } from './lib/geo-reference.mjs';
import { pairNames, parseDecree, parseLaw, parseOns } from './lib/official-texts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPORT_PATH = join(ROOT, 'supabase/data/geo-crosscheck.md');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) {
    console.error(`Argument manquant : --${name} <fichier PDF>`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

const pdfText = (path, pages = []) =>
  execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', ...pages, path, '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

const ref = JSON.parse(readFileSync(join(ROOT, 'supabase/data/geo-dz-2026.json'), 'utf8'));
const law = parseLaw(pdfText(arg('law'), ['-f', '4', '-l', '9']));
const decree = parseDecree(pdfText(arg('decree'), ['-f', '5', '-l', '5']));
const ons = parseOns(pdfText(arg('ons')));

const problems = [];
const out = [];
const line = (s = '') => out.push(s);
const wilayaName = (id) => ref.wilayas.find((w) => w.id === id)?.nameFr ?? '?';

line('# Contrôle croisé du référentiel géographique avec les textes officiels');
line();
line(
  `Généré par \`scripts/geo/crosscheck-official.mjs\` — référentiel : ${ref.source.package} ${ref.source.version}.`,
);
line();

// 1. Loi n° 26-06 — totaux et listes nominatives.
line('## 1. Loi n° 26-06 du 4 avril 2026 (JO n° 25 du 5 avril 2026)');
line();
const totalsOk =
  law.totals?.wilayas === ref.wilayas.length && law.totals?.communes === ref.communes.length;
if (!totalsOk) problems.push('totaux de la loi');
line(
  `- Article 3 : **${law.totals?.wilayas} wilayas et ${law.totals?.communes} communes** — référentiel : ${ref.wilayas.length} / ${ref.communes.length} ${totalsOk ? '✔' : '✖'}`,
);
line(
  `- Listes nominatives lues : ${law.wilayas.length} wilayas (11 nouvelles + 10 wilayas mères redécoupées)`,
);
line();
line(
  '| Wilaya | Article | Communes (loi) | Lues | Référentiel | Noms identiques | Variantes | Non appariés |',
);
line('|---|---|---|---|---|---|---|---|');
const lawVariants = [];
const lawUnmatched = [];
for (const w of law.wilayas) {
  const dataset = ref.communes.filter((c) => c.wilayaId === w.wilayaId);
  const { pairs, unmatched, extra } = pairNames(w.communes, dataset);
  const variants = pairs.filter((p) => p.kind === 'variant');
  const ok =
    w.declared === w.communes.length && w.declared === dataset.length && unmatched.length === 0;
  if (!ok) problems.push(`loi, wilaya ${w.wilayaId}`);
  for (const v of variants)
    lawVariants.push(
      `| ${pad2(w.wilayaId)} | ${v.official} | ${v.dataset.nameFr} (${v.dataset.code}) |`,
    );
  for (const u of unmatched) lawUnmatched.push(`| ${pad2(w.wilayaId)} | ${u} | — |`);
  for (const e of extra) lawUnmatched.push(`| ${pad2(w.wilayaId)} | — | ${e.nameFr} (${e.code}) |`);
  line(
    `| ${pad2(w.wilayaId)} ${wilayaName(w.wilayaId)} | ${w.article} | ${w.declared} | ${w.communes.length} | ${dataset.length} | ${pairs.length - variants.length} | ${variants.length} | ${unmatched.length + extra.length} ${ok ? '✔' : '✖'} |`,
  );
}
line();
line(`Variantes orthographiques (même commune, graphie différente) : ${lawVariants.length}`);
if (lawVariants.length) {
  line();
  line('| Wilaya | Graphie de la loi | Graphie du référentiel (code ONS) |');
  line('|---|---|---|');
  lawVariants.forEach((v) => line(v));
}
line();
line(`Communes non appariées : ${lawUnmatched.length}`);
if (lawUnmatched.length) {
  line();
  line('| Wilaya | Loi | Référentiel |');
  line('|---|---|---|');
  lawUnmatched.forEach((v) => line(v));
}
line();

// 2. Décret n° 26-206 — numérotation.
line('## 2. Décret présidentiel n° 26-206 du 25 mai 2026 (JO n° 40 du 3 juin 2026)');
line();
line('| N° | Wilaya (décret) | Référentiel | Chef-lieu (décret) | Chef-lieu du référentiel |');
line('|---|---|---|---|---|');
for (const d of decree) {
  const w = ref.wilayas.find((x) => x.id === d.id);
  const capital = ref.communes.find((c) => c.code === w?.capitalCode);
  const nameOk = w && compareNames(d.nameFr, w.nameFr) !== 'different';
  const capitalOk = capital && compareNames(d.capital, capital.nameFr) !== 'different';
  if (!nameOk || !capitalOk) problems.push(`décret, wilaya ${d.id}`);
  line(
    `| ${d.id} | ${d.nameFr} | ${w?.nameFr ?? '—'} / ${w?.nameAr ?? '—'} ${nameOk ? '✔' : '✖'} | ${d.capital} | ${capital?.nameFr ?? '—'} (${w?.capitalCode}) ${capitalOk ? '✔' : '✖'} |`,
  );
}
if (decree.length !== 11) problems.push(`décret : ${decree.length} wilayas lues au lieu de 11`);
line();

// 3. ONS — codes et noms des 1 541 communes.
line('## 3. ONS — Code géographique national (juin 2021)');
line();
const onsByCode = new Map(ons.communes.map((c) => [c.code, c]));
const missingInOns = ref.communes.filter((c) => !onsByCode.has(c.code));
const refCodes = new Set(ref.communes.map((c) => c.code));
const missingInRef = ons.communes.filter((c) => !refCodes.has(c.code));
if (missingInOns.length || missingInRef.length || ons.communes.length !== ref.communes.length)
  problems.push('codes ONS');
const fr = { identical: 0, variant: 0, different: [] };
const ar = { identical: 0, variant: [], different: [], unreadable: 0 };
for (const c of ref.communes) {
  const o = onsByCode.get(c.code);
  if (!o) continue;
  const kind = compareNames(o.nameFr, c.nameFr);
  if (kind === 'different') fr.different.push({ c, o });
  else fr[kind]++;
  if (!o.nameAr) ar.unreadable++;
  else if (matchKey(o.nameAr) === matchKey(c.nameAr)) ar.identical++;
  else if (
    compactKey(o.nameAr) === compactKey(c.nameAr) ||
    editDistance(compactKey(o.nameAr), compactKey(c.nameAr)) <= 1
  )
    ar.variant.push({ c, o });
  else ar.different.push({ c, o });
}
line(
  `- Communes lues dans le document ONS : **${ons.communes.length}** (codes uniques : ${onsByCode.size})`,
);
line(
  `- Codes du référentiel absents de l'ONS : ${missingInOns.length} ; codes ONS absents du référentiel : ${missingInRef.length}`,
);
line(
  `- Noms français : ${fr.identical} identiques, ${fr.variant} variantes orthographiques, ${fr.different.length} à examiner`,
);
line(
  `- Noms arabes : ${ar.identical} identiques, ${ar.variant.length} variantes d'une lettre, ${ar.different.length} à examiner, ${ar.unreadable} illisibles dans le PDF (graphie coupée par l'extraction)`,
);
line();
if (fr.different.length) {
  line('### Noms français à examiner (ONS ≠ référentiel)');
  line();
  line('| Code | ONS 2021 | Référentiel |');
  line('|---|---|---|');
  fr.different.forEach(({ c, o }) => line(`| ${c.code} | ${o.nameFr} | ${c.nameFr} |`));
  line();
}
if (ar.different.length || ar.variant.length) {
  line('### Noms arabes à examiner (ONS ≠ référentiel)');
  line();
  line('| Code | Commune | ONS 2021 | Référentiel | Écart |');
  line('|---|---|---|---|---|');
  [
    ...ar.variant.map((x) => ({ ...x, k: '1 lettre' })),
    ...ar.different.map((x) => ({ ...x, k: 'à examiner' })),
  ]
    .sort((a, b) => a.c.code.localeCompare(b.c.code))
    .forEach(({ c, o, k }) =>
      line(`| ${c.code} | ${c.nameFr} | ${o.nameAr} | ${c.nameAr} | ${k} |`),
    );
  line();
}

// Wilayas 1 à 58 (en-têtes du document ONS).
const wDiff = [];
for (const o of ons.wilayas) {
  const w = ref.wilayas.find((x) => x.id === o.id);
  if (!w) continue;
  const frOk = compareNames(o.nameFr, w.nameFr) !== 'different';
  const arOk = o.nameAr === null || matchKey(o.nameAr) === matchKey(w.nameAr);
  if (!frOk || !arOk)
    wDiff.push(
      `| ${o.id} | ${o.nameFr} / ${o.nameAr ?? '(illisible)'} | ${w.nameFr} / ${w.nameAr} |`,
    );
}
line(`### Wilayas : ${ons.wilayas.length} en-têtes ONS lus, ${wDiff.length} écart(s)`);
if (wDiff.length) {
  line();
  line('| N° | ONS 2021 | Référentiel |');
  line('|---|---|---|');
  wDiff.forEach((v) => line(v));
}
line();
line('## Bilan');
line();
line(
  problems.length
    ? `✖ Points bloquants : ${problems.join(', ')}`
    : '✔ Aucun point bloquant : effectifs, rattachements, numéros et codes conformes.',
);

writeFileSync(REPORT_PATH, `${out.join('\n')}\n`);
console.log(out.slice(-1)[0]);
console.log(`Rapport : supabase/data/geo-crosscheck.md`);
console.log(
  `Loi : ${lawVariants.length} variantes, ${lawUnmatched.length} non appariées | ONS : FR ${fr.different.length} à examiner, AR ${ar.different.length} à examiner + ${ar.variant.length} à 1 lettre`,
);
process.exit(problems.length ? 1 : 0);
