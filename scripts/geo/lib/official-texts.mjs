/**
 * KHD-007 — Lecture des textes officiels (texte extrait des PDF par « pdftotext -raw -enc UTF-8 »).
 * Logique pure, testée : aucune lecture de fichier ici.
 */

import { compactKey, compareNames, editDistance } from './geo-reference.mjs';

const PAGE_NOISE = [
  /JOURNAL OFFICIEL DE LA REPUBLIQUE ALGERIENNE/,
  /^\d{1,2} (Chaoual|Dhou El Hidja) 1447$/,
  /^\d{1,2} (avril|juin|mai) 2026$/,
];

const cleanLines = (text) =>
  text
    .replace(/\f/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !PAGE_NOISE.some((re) => re.test(line)));

/** Numéro de wilaya d'un article de la loi n° 84-09 (art. 4 → wilaya 01 ; art. 52 bis 10 → wilaya 59). */
export function articleToWilaya(article) {
  const bis = /^52\.?\s*bis\s*(\d+)$/i.exec(article.trim());
  if (bis) return 49 + Number(bis[1]);
  return Number(article) - 4;
}

/**
 * Loi n° 26-06 : total déclaré (art. 3) et listes de communes par wilaya.
 * @returns {{ totals: {wilayas:number, communes:number} | null, wilayas: {article:string, wilayaId:number, declared:number, communes:string[]}[] }}
 */
export function parseLaw(text) {
  const lines = cleanLines(text);
  const joined = lines.join(' ');
  const totalMatch = /comprend\s+[^()]*\((\d+)\)\s+wilayas\s+et\s+[^()]*\((\d+)\)\s+communes/i.exec(
    joined,
  );
  const totals = totalMatch
    ? { wilayas: Number(totalMatch[1]), communes: Number(totalMatch[2]) }
    : null;

  const wilayas = [];
  let current = null;
  const header =
    /Art\.\s*(\d+|52\.?\s*bis\s*\d+)\s*\.?\s*[—–-]+\s*Les\s+.*?\((\d+)\)\s+communes(?:\s+suivantes)?/i;
  for (let i = 0; i < lines.length; i++) {
    // L'en-tête d'article peut être coupé sur deux lignes.
    const candidate = `${lines[i]} ${lines[i + 1] ?? ''}`;
    const h = /^«?\s*Art\./.test(lines[i]) ? header.exec(candidate) : null;
    if (h) {
      current = {
        article: h[1].replace(/\s+/g, ' '),
        wilayaId: articleToWilaya(h[1]),
        declared: Number(h[2]),
        communes: [],
      };
      wilayas.push(current);
      continue;
    }
    if (!current) continue;
    const item = /^(\d+)\.\s+(.+?)\s*(?:;|\.\s*»\s*\.?|\.)?\s*$/.exec(lines[i]);
    if (item && Number(item[1]) === current.communes.length + 1) {
      current.communes.push(item[2].replace(/\s*».*$/, '').trim());
      if (current.communes.length === current.declared) current = null;
    }
  }
  return { totals, wilayas };
}

/** Décret n° 26-206 : numéros, noms et chefs-lieux des wilayas 59 à 69. */
export function parseDecree(text) {
  const joined = cleanLines(text).join(' ');
  const re =
    /(\d{2})-\s*Wilaya\s+(?:de\s+|d['’]\s*)(.+?)\s+avec\s+chef-\s*lieu\s+la\s+ville\s+(?:de\s+|d['’]\s*)(.+?)\s*[;.](?=\s|$)/g;
  const out = [];
  for (const m of joined.matchAll(re)) {
    out.push({ id: Number(m[1]), nameFr: m[2].trim(), capital: m[3].trim() });
  }
  return out;
}

const ARABIC_ONLY = /^[؀-ۿ\s()ـ]+$/;
const reverseArabic = (visual) => [...visual].reverse().join('').replace(/\s+/g, ' ').trim();

/**
 * ONS, Code géographique national 2021 : une ligne par commune « NOM WW CC <arabe visuel> ».
 * Le texte arabe est extrait en ordre visuel (inversé) ; il est remis dans l'ordre logique.
 * Une graphie arabe coupée sur plusieurs lignes est marquée incomplète (non comparée).
 */
export function parseOns(text) {
  const lines = cleanLines(text);
  const communes = [];
  const wilayas = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const c = /^([A-Z0-9][A-Z0-9 .'’()\-/]*?)\s+(\d{2}) (\d{2})(?:\s+(.*))?$/.exec(line);
    if (c) {
      const next = lines[i + 1] ?? '';
      const arabic = (c[4] ?? '').trim();
      const complete = arabic !== '' && !(ARABIC_ONLY.test(next) && next.length <= 12);
      communes.push({
        code: `${c[2]}${c[3]}`,
        nameFr: c[1].trim(),
        nameAr: complete ? reverseArabic(arabic) : null,
      });
      continue;
    }
    const w = /^([A-Z][A-Z' -]*[A-Z])\s+(\d{2})\s+([؀-ۿ ]+)$/.exec(line);
    if (w && w[1] !== 'Commune') {
      const next = lines[i + 1] ?? '';
      const complete = !(ARABIC_ONLY.test(next) && next.length <= 12);
      wilayas.push({
        id: Number(w[2]),
        nameFr: w[1],
        nameAr: complete ? reverseArabic(w[3]) : null,
      });
    }
  }
  return { communes, wilayas };
}

/** Apparie deux listes de noms : identiques d'abord, puis variantes orthographiques les plus proches. */
export function pairNames(official, dataset) {
  const remaining = [...dataset];
  const pairs = [];
  const unmatched = [];
  const pending = [];
  for (const name of official) {
    const i = remaining.findIndex((d) => compareNames(name, d.nameFr) === 'identical');
    if (i >= 0)
      pairs.push({ official: name, dataset: remaining.splice(i, 1)[0], kind: 'identical' });
    else pending.push(name);
  }
  for (const name of pending) {
    let best = -1;
    let bestDistance = Infinity;
    remaining.forEach((d, i) => {
      if (compareNames(name, d.nameFr) !== 'variant') return;
      const dist = editDistance(compactKey(name), compactKey(d.nameFr));
      if (dist < bestDistance) [best, bestDistance] = [i, dist];
    });
    if (best >= 0)
      pairs.push({ official: name, dataset: remaining.splice(best, 1)[0], kind: 'variant' });
    else unmatched.push(name);
  }
  return { pairs, unmatched, extra: remaining };
}
