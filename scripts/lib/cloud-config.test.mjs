// Exécution : node --test scripts/lib/   (mots de passe ci-dessous FICTIFS)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  describePasswordSetup,
  maskSecret,
  parseEnvFile,
  parsePoolerUrl,
} from './cloud-config.mjs';

const REF = 'abcdefghijklmnopqrst';
const HOST = 'aws-0-eu-west-1.pooler.supabase.com';

test('parseEnvFile : espaces de fin, CRLF et BOM ignorés', () => {
  const env = parseEnvFile('﻿A=valeur@123   \r\nB= x \r\n# C=commentaire\r\n');
  assert.equal(env.A, 'valeur@123');
  assert.equal(env.B, 'x');
  assert.equal(env.C, undefined);
});

test('parseEnvFile : guillemets retirés seulement par paire', () => {
  const env = parseEnvFile(`A="p@ss word"\nB='abc'\nC=abc"\nD="abc\nE="a'`);
  assert.equal(env.A, 'p@ss word');
  assert.equal(env.B, 'abc');
  assert.equal(env.C, 'abc"');
  assert.equal(env.D, '"abc');
  assert.equal(env.E, `"a'`);
});

test('parseEnvFile : # et = dans la valeur conservés', () => {
  assert.equal(parseEnvFile('A=p#ss=w@rd').A, 'p#ss=w@rd');
});

test('parsePoolerUrl : URI avec placeholder', () => {
  const p = parsePoolerUrl(`postgresql://postgres.${REF}:[YOUR-PASSWORD]@${HOST}:5432/postgres`);
  assert.deepEqual(p, {
    user: `postgres.${REF}`,
    host: HOST,
    port: '5432',
    database: 'postgres',
    embeddedPassword: '[YOUR-PASSWORD]',
  });
});

test('parsePoolerUrl : mot de passe réel non encodé contenant @ # / ? :', () => {
  const p = parsePoolerUrl(`postgresql://postgres.${REF}:a@b#c/d?e:f@${HOST}:5432/postgres`);
  assert.equal(p.user, `postgres.${REF}`);
  assert.equal(p.host, HOST);
  assert.equal(p.port, '5432');
  assert.equal(p.embeddedPassword, 'a@b#c/d?e:f');
});

test('parsePoolerUrl : mot de passe encodé (%40)', () => {
  const p = parsePoolerUrl(
    `postgresql://postgres.${REF}:a%40b@${HOST}:6543/postgres?sslmode=require`,
  );
  assert.equal(p.host, HOST);
  assert.equal(p.port, '6543');
  assert.equal(p.embeddedPassword, 'a%40b');
});

test('parsePoolerUrl : URI invalide', () => {
  assert.equal(parsePoolerUrl('https://exemple.dz'), null);
});

test('describePasswordSetup : détecte un mot de passe encodé sans le révéler', () => {
  const hints = describePasswordSetup(
    'ab%40cd',
    parsePoolerUrl(`postgresql://u:[YOUR-PASSWORD]@${HOST}:5432/postgres`),
  );
  assert.ok(hints.some((h) => h.includes('%xx')));
  assert.ok(hints.every((h) => !h.includes('ab%40cd')));
});

test("describePasswordSetup : mot de passe de l'URI différent", () => {
  const hints = describePasswordSetup(
    'secret@1',
    parsePoolerUrl(`postgresql://u:autre@${HOST}:5432/postgres`),
  );
  assert.ok(hints.some((h) => h.includes('DIFFÉRENT')));
  assert.ok(hints.every((h) => !h.includes('secret@1') && !h.includes('autre')));
});

test('maskSecret : masque les formes brute et encodée', () => {
  assert.equal(maskSecret('x p@ss y p%40ss z', 'p@ss'), 'x *** y *** z');
});
