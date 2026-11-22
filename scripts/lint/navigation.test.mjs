// Non-régression KHD-008-NAV (« The action 'GO_BACK' was not handled by any navigator »).
// Exécution : node --test "scripts/**/*.test.mjs"
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'mobile', 'src');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('aucun retour arrière direct hors de lib/navigation.ts', () => {
  const offenders = sourceFiles(SRC)
    .filter((path) => !path.endsWith(join('lib', 'navigation.ts')))
    .filter((path) => /router\.back\(\)|\.goBack\(\)/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path));
  assert.deepEqual(offenders, [], 'utiliser safeBack() / useSafeBack() de @/lib/navigation');
});

test('les écrans pouvant ouvrir sans historique gèrent aussi le bouton Retour Android', () => {
  for (const screen of [
    '(auth)/sign-in.tsx',
    '(auth)/sign-up.tsx',
    '(auth)/forgot-password.tsx',
    'terms.tsx',
  ]) {
    assert.match(readFileSync(join(SRC, 'app', screen), 'utf8'), /useSafeBack\(/, screen);
  }
});

test('« Créer un compte » / « Se connecter » remplacent l’écran (pas d’empilement de connexions)', () => {
  const signIn = readFileSync(join(SRC, 'app', '(auth)', 'sign-in.tsx'), 'utf8');
  const signUp = readFileSync(join(SRC, 'app', '(auth)', 'sign-up.tsx'), 'utf8');
  assert.match(signIn, /router\.replace\('\/sign-up'\)/);
  assert.match(signUp, /router\.replace\('\/sign-in'\)/);
});

// KHD-008-AUTH-UX : confirmation d'adresse e-mail.
test('le mot de passe n’est jamais transmis dans les paramètres de navigation', () => {
  for (const screen of ['(auth)/sign-up.tsx', '(auth)/check-email.tsx', '(auth)/sign-in.tsx']) {
    const source = readFileSync(join(SRC, 'app', screen), 'utf8');
    const navigations = source.match(/router\.(replace|push)\([^)]*\)/gs) ?? [];
    for (const call of navigations) {
      // Paramètres transmis à l'écran suivant (les noms de route comme /forgot-password sont permis).
      assert.doesNotMatch(call, /params\s*:\s*\{[^}]*password|\.password/i, `${screen} : ${call}`);
    }
  }
});

test('les identifiants en attente de confirmation ne sont jamais enregistrés sur l’appareil', () => {
  const source = readFileSync(join(SRC, 'features', 'auth', 'pendingConfirmation.ts'), 'utf8');
  assert.doesNotMatch(source, /AsyncStorage|SecureStore|localStorage|console\./);
});

test('l’écran « Adresse e-mail confirmée » gère le bouton Retour Android', () => {
  assert.match(readFileSync(join(SRC, 'app', 'email-confirmed.tsx'), 'utf8'), /useSafeBack\(/);
});
