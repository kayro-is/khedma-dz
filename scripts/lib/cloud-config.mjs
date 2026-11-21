/**
 * Lecture de .env.supabase.local et analyse de l'URI Session pooler — logique pure, testée
 * (scripts/lib/cloud-config.test.mjs). Aucune fonction ne renvoie ni n'affiche de secret.
 */

/** Parse un fichier .env : `CLE=valeur`, commentaires `#` en début de ligne, guillemets appariés. */
export function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2];
    // Guillemets retirés uniquement s'ils encadrent toute la valeur (paire identique).
    const quoted = /^(["'])(.*)\1$/.exec(value);
    if (quoted) value = quoted[2];
    values[match[1]] = value;
  }
  return values;
}

/**
 * Analyse une URI Session pooler sans dépendre du mot de passe qu'elle contient éventuellement
 * (placeholder [YOUR-PASSWORD] ou mot de passe réel avec @ # / ? : non encodés).
 * L'hôte est ce qui suit le DERNIER « @ ».
 */
export function parsePoolerUrl(uri) {
  const match =
    /^postgres(?:ql)?:\/\/([^:@/]+)(?::(.*))?@([^@:/?#]+)(?::(\d+))?(?:\/([^?#]*))?(?:[?#].*)?$/.exec(
      uri.trim(),
    );
  if (!match) return null;
  const [, user, embeddedPassword, host, port, database] = match;
  return {
    user: safeDecode(user),
    host,
    port: port ?? '5432',
    database: database || 'postgres',
    embeddedPassword: embeddedPassword ?? null,
  };
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Indices NON SECRETS pour diagnostiquer un échec d'authentification :
 * aucune valeur, seulement des caractéristiques (longueur, espaces, encodage…).
 */
export function describePasswordSetup(password, pooler) {
  const hints = [];
  hints.push(`longueur du mot de passe lu : ${password.length} caractères`);
  if (password !== password.trim()) hints.push('⚠ le mot de passe commence ou finit par un espace');
  if (/%[0-9A-Fa-f]{2}/.test(password)) {
    hints.push(
      '⚠ le mot de passe contient une séquence « %xx » : saisissez-le en clair (ex. « @ » et non « %40 ») dans DB_PASSWORD',
    );
  }
  if (/^["'].*|.*["']$/.test(password))
    hints.push('⚠ le mot de passe commence ou finit par un guillemet');
  if (/[^\x20-\x7E]/.test(password)) {
    hints.push(
      '⚠ le mot de passe contient des caractères non ASCII (accents, espaces insécables…)',
    );
  }
  const embedded = pooler.embeddedPassword;
  if (embedded === null) {
    hints.push("l'URI ne contient pas de mot de passe (normal)");
  } else if (embedded === '[YOUR-PASSWORD]') {
    hints.push("l'URI contient le texte [YOUR-PASSWORD] (normal : il est ignoré)");
  } else {
    const same = embedded === password || safeDecode(embedded) === password;
    hints.push(
      same
        ? "l'URI contient le même mot de passe que DB_PASSWORD (ignoré ; vous pouvez remettre [YOUR-PASSWORD])"
        : "⚠ l'URI contient un mot de passe DIFFÉRENT de DB_PASSWORD (c'est DB_PASSWORD qui est utilisé)",
    );
  }
  return hints;
}

/** Remplace toute occurrence du secret (brut ou encodé) dans un texte destiné aux logs. */
export function maskSecret(text, secret) {
  if (!text || !secret) return text ?? '';
  let out = text;
  for (const form of new Set([secret, encodeURIComponent(secret)])) {
    out = out.split(form).join('***');
  }
  return out;
}
