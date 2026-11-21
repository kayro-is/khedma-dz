#!/usr/bin/env node
/**
 * Opérations sur les projets Supabase Cloud, sans Docker.
 *
 *   pnpm cloud <test|prod> <action> [--yes]
 *
 * Actions en LECTURE SEULE (aucune modification distante) :
 *   doctor        configuration, connexion, extensions disponibles, état du schéma
 *   migrations    migrations locales vs historique distant
 *   push-dry      migrations qui seraient appliquées (+ seed pour test), sans rien appliquer
 *   app-env       crée apps/mobile/.env et apps/admin/.env.local (valeurs publiques, test uniquement)
 *   auth-check    réglages Auth distants comparés à supabase/config.toml
 *   seed-check    contrôle du seed de démonstration (test uniquement)
 *   avatar-check  diagnostic des photos (profil et galerie), lecture seule (test uniquement)
 *   verify        audit de sécurité : RLS, droits, fonctions, PostGIS, buckets, Realtime
 *   lint          analyse des fonctions PL/pgSQL
 *   types         génère packages/types/src/database.ts depuis le schéma distant
 *   test          tests pgTAP (projet de test uniquement ; chaque fichier finit par ROLLBACK)
 *   integration   tests d'intégration via les API (projet de test uniquement)
 *
 * Action qui MODIFIE la base distante (exige --yes, à ne lancer qu'après validation humaine) :
 *   push          applique les migrations (+ seed de démonstration pour « test » uniquement)
 *
 * Les secrets sont lus dans .env.supabase.local (ignoré par Git) et ne sont jamais affichés.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  describePasswordSetup,
  maskSecret,
  parseEnvFile,
  parsePoolerUrl,
} from './lib/cloud-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(ROOT, '.env.supabase.local');
const CLI = 'supabase@3.2.0';
const isWindows = process.platform === 'win32';

const [target, action, ...flags] = process.argv.slice(2);
const confirmed = flags.includes('--yes');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!['test', 'prod'].includes(target) || !action) {
  fail(
    'Usage : pnpm cloud <test|prod> <doctor|migrations|push-dry|push|verify|lint|types|test|integration> [--yes]',
  );
}

// ----------------------------------------------------------------------------- Configuration
function loadEnvFile() {
  if (!existsSync(ENV_FILE)) {
    fail(
      'Fichier .env.supabase.local introuvable. Copiez .env.supabase.example et remplissez-le (voir README).',
    );
  }
  return parseEnvFile(readFileSync(ENV_FILE, 'utf8'));
}

const fileEnv = loadEnvFile();
const prefix = `SUPABASE_${target.toUpperCase()}_`;
const cfg = {
  ref: fileEnv[`${prefix}PROJECT_REF`],
  password: fileEnv[`${prefix}DB_PASSWORD`],
  poolerUrl: fileEnv[`${prefix}POOLER_URL`],
  publishableKey: fileEnv[`${prefix}PUBLISHABLE_KEY`],
};

const missing = ['ref', 'password', 'poolerUrl']
  .filter((key) => !cfg[key])
  .map((key) => ({ ref: 'PROJECT_REF', password: 'DB_PASSWORD', poolerUrl: 'POOLER_URL' })[key]);
if (missing.length)
  fail(
    `Valeurs manquantes dans .env.supabase.local : ${missing.map((m) => prefix + m).join(', ')}`,
  );
if (!/^[a-z]{20}$/.test(cfg.ref))
  fail(`${prefix}PROJECT_REF doit contenir exactement 20 lettres minuscules.`);

const otherPrefix = target === 'test' ? 'SUPABASE_PROD_' : 'SUPABASE_TEST_';
if (fileEnv[`${otherPrefix}PROJECT_REF`] === cfg.ref) {
  fail('Les projets de test et principal ont la même référence : ils doivent être distincts.');
}

// Le mot de passe éventuellement présent dans l'URI est ignoré : seul DB_PASSWORD est utilisé,
// transmis en clair par variable d'environnement (aucun encodage URI nécessaire, « @ » compris).
const pooler = parsePoolerUrl(cfg.poolerUrl);
if (!pooler || !pooler.host.endsWith('.pooler.supabase.com')) {
  fail(`${prefix}POOLER_URL invalide : copiez l'URI « Session pooler » du bouton « Connect ».`);
}
if (pooler.port === '6543') {
  fail('Utilisez la chaîne « Session pooler » (port 5432), pas « Transaction pooler » (6543).');
}
// Le pooler (Supavisor) exige l'utilisateur « postgres.<ref> », pas « postgres ».
if (pooler.user !== `postgres.${cfg.ref}`) {
  fail(
    `${prefix}POOLER_URL : utilisateur attendu « postgres.${cfg.ref} » (URI Session pooler du bon projet).`,
  );
}
const db = { host: pooler.host, port: pooler.port, user: pooler.user, database: pooler.database };

const mask = (text) => maskSecret(text, cfg.password);

// ----------------------------------------------------------------------------- Exécution
// Sous Windows, npx / pnpm sont des scripts .cmd qui exigent un shell : la ligne de commande
// est alors construite ici, avec des arguments cités (aucun secret n'y figure).
const quoteArg = (arg) => (/^[\w@./:=,-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);

function run(command, args, { env = {}, capture = false, input } = {}) {
  const viaShell = isWindows && (command === 'npx' || command === 'pnpm');
  const result = spawnSync(
    viaShell ? [command, ...args].map(quoteArg).join(' ') : command,
    viaShell ? [] : args,
    {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      input,
      stdio: capture ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'inherit', 'inherit'],
      shell: viaShell,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (capture) {
    result.stdout = mask(result.stdout);
    result.stderr = mask(result.stderr);
  }
  return result;
}

// Mot de passe transmis par variable d'environnement (jamais dans la ligne de commande).
const pgEnv = {
  PGHOST: db.host,
  PGPORT: db.port,
  PGUSER: db.user,
  PGDATABASE: db.database,
  PGPASSWORD: cfg.password,
  PGSSLMODE: 'require',
  PGCLIENTENCODING: 'UTF8',
  PGAPPNAME: 'khedma-cli',
};

function psql(args, opts = {}) {
  return run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...args], { env: pgEnv, ...opts });
}

function supabase(args, opts = {}) {
  // Sortie toujours capturée puis masquée avant affichage : le mot de passe n'apparaît jamais.
  const result = run('npx', ['--yes', CLI, ...args], {
    ...opts,
    capture: true,
    env: { SUPABASE_DB_PASSWORD: cfg.password, ...opts.env },
  });
  if (!opts.capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result;
}

// Cible désignée par sa référence ; le mot de passe passe par SUPABASE_DB_PASSWORD (jamais en argument).
function remoteDbArgs() {
  return [`--remote=${cfg.ref}`];
}

function requireTestTarget() {
  if (target !== 'test')
    fail(
      `« ${action} » est réservé au projet de test : il ne s'exécute jamais sur le projet principal.`,
    );
}

function header(title) {
  console.log(`\n=== ${title} — projet ${target.toUpperCase()} (${cfg.ref}) ===\n`);
}

// ----------------------------------------------------------------------------- Actions
const actions = {
  doctor() {
    header('Diagnostic (lecture seule)');
    const login = run('npx', ['--yes', CLI, 'projects', 'list', '-o', 'json'], { capture: true });
    if (login.status !== 0) {
      console.log('✖ CLI non connectée : lancez « npx supabase@3.2.0 login » dans votre terminal.');
    } else {
      try {
        // CLI 3.x : {"projects":[...]} ; versions antérieures : tableau direct.
        const start = login.stdout.search(/[[{]/);
        const parsed = JSON.parse(login.stdout.slice(start));
        const projects = Array.isArray(parsed) ? parsed : (parsed.projects ?? []);
        const project = projects.find((p) => p.id === cfg.ref || p.ref === cfg.ref);
        console.log(
          project
            ? `✔ CLI connectée, projet trouvé : « ${project.name} » (région ${project.region})`
            : "✖ CLI connectée, mais ce projet n'apparaît pas dans votre compte.",
        );
      } catch {
        console.log('? Réponse inattendue de « supabase projects list ».');
      }
    }
    console.log(`  utilisateur : ${db.user}`);
    console.log(`  hôte        : ${db.host}:${db.port} (Session pooler)`);
    const result = psql(['-At', '-F', ' | ', '-f', join(ROOT, 'scripts/sql/doctor.sql')], {
      capture: true,
    });
    if (result.status !== 0) {
      console.error(`\n✖ Connexion à la base impossible :\n${result.stderr.trim()}`);
      if (/password authentication failed/i.test(result.stderr)) {
        console.error("\nIndices (aucune valeur secrète n'est affichée) :");
        for (const hint of describePasswordSetup(cfg.password, pooler))
          console.error(`  - ${hint}`);
        console.error(
          "\nLe pooler n'affiche que « postgres » dans ce message, mais c'est bien l'utilisateur ci-dessus qui est envoyé." +
            '\nSi tout semble correct : réinitialisez le mot de passe (Database Settings > Reset database password),' +
            '\nreportez-le dans DB_PASSWORD, puis attendez 1 à 2 minutes avant de réessayer.',
        );
      }
      process.exit(1);
    }
    console.log('✔ Connexion à la base établie (lecture seule)\n');
    console.log(result.stdout);
  },

  migrations() {
    header('Migrations locales / distantes (lecture seule)');
    process.exit(supabase(['migration', 'list', ...remoteDbArgs()]).status ?? 1);
  },

  'push-dry'() {
    header('Simulation : aucune modification ne sera appliquée');
    const seed = target === 'test' ? ['--include-seed'] : [];
    process.exit(supabase(['db', 'push', ...remoteDbArgs(), '--dry-run', ...seed]).status ?? 1);
  },

  push() {
    header(
      target === 'prod'
        ? 'APPLICATION DES MIGRATIONS SUR LE PROJET PRINCIPAL'
        : 'Application migrations + seed de démonstration',
    );
    if (!confirmed) {
      fail(
        'Opération distante modifiant la base : relancez avec --yes après avoir validé « push-dry ».',
      );
    }
    if (target === 'prod') {
      // Liaison du dossier supabase/ au projet principal (supabase/.temp, ignoré par Git).
      const link = supabase(['link', '--project-ref', cfg.ref, '--yes'], { capture: true });
      if (link.status !== 0) fail(`supabase link a échoué :\n${link.stderr || link.stdout}`);
      console.log('✔ Dossier supabase/ lié au projet principal');
    }
    const seed = target === 'test' ? ['--include-seed'] : [];
    process.exit(supabase(['db', 'push', ...remoteDbArgs(), ...seed, '--yes']).status ?? 1);
  },

  // Fichiers locaux uniquement (aucune opération distante). Seules des valeurs PUBLIQUES sont copiées.
  'app-env'() {
    requireTestTarget();
    header('Configuration des applications (fichiers locaux)');
    const key = (cfg.publishableKey ?? '').trim();
    if (!key.startsWith('sb_publishable_')) {
      fail(
        `${prefix}PUBLISHABLE_KEY doit être la « Publishable key » (sb_publishable_…). Une clé secrète ne doit jamais aller dans une application.`,
      );
    }
    const url = `https://${cfg.ref}.supabase.co`;
    const files = [
      {
        path: join(ROOT, 'apps/mobile/.env'),
        content: `# Généré par « pnpm cloud test app-env » — projet Supabase de TEST. Valeurs publiques uniquement.\nEXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${key}\n`,
      },
      {
        path: join(ROOT, 'apps/admin/.env.local'),
        content: `# Généré par « pnpm cloud test app-env » — projet Supabase de TEST. Valeurs publiques uniquement.\nNEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${key}\n`,
      },
    ];
    for (const file of files) {
      if (existsSync(file.path)) {
        console.log(
          `• ${file.path} existe déjà : conservé tel quel (supprimez-le pour le régénérer).`,
        );
      } else {
        writeFileSync(file.path, file.content, { flag: 'wx' });
        console.log(`✔ ${file.path} créé (URL du projet de test + clé publique)`);
      }
    }
  },

  // Compare les réglages Auth du projet à ceux déclarés dans supabase/config.toml (lecture seule).
  'auth-check'() {
    header('Réglages Auth (lecture seule)');
    const result = run(
      'npx',
      ['--yes', CLI, 'config', 'diff', `--remote=${cfg.ref}`, '--output-format', 'json'],
      { capture: true },
    );
    let report;
    try {
      report = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    } catch {
      fail(`Lecture de la configuration distante impossible :\n${result.stderr || result.stdout}`);
    }
    const authChanges = report.changes.filter((c) => c.path[0] === 'auth');
    if (authChanges.length === 0) {
      console.log('✔ Réglages Auth conformes à supabase/config.toml.');
      return;
    }
    for (const change of authChanges) {
      console.log(
        `✖ auth.${change.path.slice(1).join('.')} : actuel ${JSON.stringify(change.remote)} → attendu ${JSON.stringify(change.local)}`,
      );
    }
    fail(`${authChanges.length} réglage(s) Auth à corriger dans le dashboard.`);
  },

  'seed-check'() {
    requireTestTarget();
    header('Vérification du seed de démonstration (lecture seule)');
    const result = psql(['-P', 'pager=off', '-f', join(ROOT, 'scripts/sql/seed-check.sql')], {
      capture: true,
    });
    console.log(result.stdout);
    if (result.status !== 0) fail(result.stderr);
    const failures = result.stdout.split('\n').filter((line) => /\|\s*FAIL\s*$/.test(line)).length;
    if (failures > 0) fail(`${failures} élément(s) ne correspondent pas au seed attendu.`);
    console.log('✔ Seed de démonstration complet et cohérent.');
  },

  'avatar-check'() {
    requireTestTarget();
    header('Diagnostic des photos de profil et de la galerie (lecture seule)');
    const result = psql(['-P', 'pager=off', '-f', join(ROOT, 'scripts/sql/avatar-check.sql')], {
      capture: true,
    });
    console.log(result.stdout);
    if (result.status !== 0) fail(result.stderr);
  },

  verify() {
    header('Audit de sécurité (lecture seule)');
    const result = psql(['-P', 'pager=off', '-f', join(ROOT, 'scripts/sql/verify.sql')], {
      capture: true,
    });
    console.log(result.stdout);
    if (result.status !== 0) fail(result.stderr);
    const failures = result.stdout.split('\n').filter((line) => /\|\s*FAIL\s*\|/.test(line)).length;
    if (failures > 0) fail(`${failures} contrôle(s) en échec.`);
    console.log('✔ Tous les contrôles de sécurité sont conformes.');
  },

  lint() {
    header('Analyse PL/pgSQL (lecture seule)');
    process.exit(
      supabase([
        'db',
        'lint',
        ...remoteDbArgs(),
        '--schema',
        'public,private',
        '--level',
        'warning',
      ]).status ?? 1,
    );
  },

  types() {
    header('Génération des types TypeScript');
    const result = supabase(
      ['gen', 'types', 'typescript', `--remote=${cfg.ref}`, '--schema', 'public'],
      { capture: true },
    );
    if (result.status !== 0) fail(`Génération impossible :\n${result.stderr}`);
    const out = join(ROOT, 'packages/types/src/database.ts');
    const banner = `// Fichier généré par « pnpm cloud ${target} types » — ne pas modifier à la main.\n`;
    writeFileSync(out, banner + result.stdout.slice(result.stdout.indexOf('export')));
    run('npx', ['prettier', '--write', out], { capture: true });
    console.log(`✔ ${out}`);
  },

  test() {
    requireTestTarget();
    header('Tests pgTAP');
    const dir = join(ROOT, 'supabase/tests/database');
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.test.sql'))
      .sort();
    let passed = 0;
    let failedFiles = 0;
    for (const file of files) {
      const result = psql(['-q', '-At', '-f', join(dir, file)], { capture: true });
      const lines = result.stdout.split(/\r?\n/);
      const plan = Number(/^1\.\.(\d+)$/m.exec(result.stdout)?.[1] ?? NaN);
      const ok = lines.filter((l) => /^ok \d+/.test(l)).length;
      const notOk = lines.filter((l) => /^not ok \d+/.test(l));
      const fileFailed =
        result.status !== 0 ||
        notOk.length > 0 ||
        ok !== plan ||
        /# Looks like/.test(result.stdout);
      passed += ok;
      if (fileFailed) {
        failedFiles += 1;
        console.log(`✖ ${file} — ${ok}/${Number.isNaN(plan) ? '?' : plan}`);
        for (const line of lines.filter((l) => /^(not ok|#)/.test(l))) console.log(`    ${line}`);
        if (result.stderr.trim())
          console.log(`    ${result.stderr.trim().split('\n').join('\n    ')}`);
      } else {
        console.log(`✔ ${file} — ${ok}/${plan}`);
      }
    }
    console.log(`\n${passed} assertions réussies, ${failedFiles} fichier(s) en échec.`);
    process.exit(failedFiles === 0 ? 0 : 1);
  },

  integration() {
    requireTestTarget();
    if (!cfg.publishableKey) fail(`${prefix}PUBLISHABLE_KEY manquant dans .env.supabase.local.`);
    header("Tests d'intégration (API Auth + REST)");
    const result = run('pnpm', ['--filter', '@khedma/integration-tests', 'exec', 'vitest', 'run'], {
      env: {
        SUPABASE_URL: `https://${cfg.ref}.supabase.co`,
        SUPABASE_ANON_KEY: cfg.publishableKey,
      },
    });
    process.exit(result.status ?? 1);
  },
};

if (!actions[action]) fail(`Action inconnue : ${action}`);
actions[action]();
