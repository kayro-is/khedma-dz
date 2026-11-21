# Khedma DZ — خدمة ديزاد

> **Le bon artisan, juste à côté de chez vous.**

Marketplace algérienne de mise en relation entre particuliers et artisans de proximité.
Application mobile unique (Android / iOS) avec deux espaces (Particulier et Artisan), plus une
interface web d'administration. **Bilingue français (LTR) / arabe (RTL) dès le MVP.**

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Démarrage rapide](#démarrage-rapide)
3. [Structure du monorepo](#structure-du-monorepo)
4. [Commandes](#commandes)
5. [Internationalisation (fr / ar)](#internationalisation-fr--ar)
6. [Variables d'environnement](#variables-denvironnement)
7. [Espaces Particulier / Artisan](#espaces-particulier--artisan-khd-006)
8. [Référentiel géographique](#référentiel-géographique-khd-007)
9. [Choix techniques](#choix-techniques)
10. [Conventions](#conventions)

---

## Prérequis

| Outil             | Version                   | Remarque                                                    |
| ----------------- | ------------------------- | ----------------------------------------------------------- |
| Node.js           | **24 LTS recommandé**     | `>= 20.19.4` requis. Node 25 fonctionne mais n'est pas LTS. |
| pnpm              | `>= 10` (projet : 12.3.4) | Fixé via `packageManager` dans `package.json`.              |
| Git               | récent                    | Git Bash sous Windows.                                      |
| Expo Go / build   | SDK 58                    | Sur téléphone Android pour tester (même réseau Wi-Fi).      |
| PostgreSQL (psql) | 16+ (client seulement)    | Exécution des tests pgTAP et de l'audit sur Supabase Cloud. |

Pas de Docker : la base de données est hébergée sur **Supabase Cloud** (voir ci-dessous).

Toutes les commandes ci-dessous fonctionnent sous **Windows + Git Bash**.

## Démarrage rapide

```bash
pnpm install

# Application mobile (Expo) — scannez le QR code avec Expo Go
pnpm dev:mobile

# Administration (Next.js) — http://localhost:3000
pnpm dev:admin
```

Vérification complète (format, lint, types, tests) :

```bash
pnpm check
```

## Supabase Cloud

Deux projets distincts :

| Projet   | Usage                                                                 |
| -------- | --------------------------------------------------------------------- |
| **test** | Développement, données de démonstration, tests pgTAP et d'intégration |
| **prod** | Projet principal : migrations uniquement, jamais de seed ni de tests  |

Configuration (une seule fois) :

1. `npx supabase@3.2.0 login` dans votre terminal (ouvre le navigateur ; jeton stocké localement).
2. Copier `.env.supabase.example` vers `.env.supabase.local` (ignoré par Git) et le remplir
   **dans l'éditeur** — jamais dans un chat ni un commit.
3. `pnpm cloud test doctor` puis `pnpm cloud prod doctor` (lecture seule).

Commandes : `pnpm cloud <test|prod> <action>`

| Action        | Effet                                                                                       | Modifie la base |
| ------------- | ------------------------------------------------------------------------------------------- | --------------- |
| `doctor`      | Connexion, extensions, tables et migrations déjà présentes                                  | non             |
| `migrations`  | Migrations locales comparées à l'historique distant                                         | non             |
| `push-dry`    | Simulation de `db push` (avec seed pour `test`)                                             | non             |
| `push --yes`  | Applique les migrations (`test` : + seed de démonstration ; `prod` : `link` puis `db push`) | **oui**         |
| `verify`      | Audit : RLS, droits par colonne, fonctions, PostGIS, buckets, Realtime                      | non             |
| `lint`        | Analyse des fonctions PL/pgSQL                                                              | non             |
| `types`       | Régénère `packages/types/src/database.ts`                                                   | non             |
| `test`        | Tests pgTAP via `psql`, chacun annulé par `ROLLBACK` (`test` uniquement)                    | non             |
| `integration` | Tests via les API Auth + REST (`test` uniquement)                                           | non             |

Procédure pour toute nouvelle migration : `test push-dry` → `test push --yes` → `test test`
→ `test verify` → `prod doctor` → `prod push-dry` → validation humaine → `prod push --yes`
→ `prod verify`.

## Structure du monorepo

```text
khedma-dz/
├── apps/
│   ├── mobile/                  # Expo SDK 58 + Expo Router (React Native 0.88)
│   │   ├── app.json
│   │   ├── assets/
│   │   └── src/
│   │       ├── app/             # Routes Expo Router
│   │       │   ├── _layout.tsx  # i18n, polices, splash, ToastHost
│   │       │   ├── index.tsx    # Accueil (redirige vers le choix de langue au 1er lancement)
│   │       │   ├── (onboarding)/language.tsx
│   │       │   ├── particulier/ # Onglets espace Particulier  → /particulier/...
│   │       │   ├── artisan/     # Onglets espace Artisan      → /artisan/...
│   │       │   ├── dev/ui.tsx   # Catalogue des composants (développement uniquement)
│   │       │   └── (auth)/  (shared)/
│   │       ├── components/
│   │       │   ├── ui/          # Text, Button, IconButton, Badge, Avatar, Card, Modal, BottomSheet, Toast…
│   │       │   ├── form/        # TextInput, SearchInput, Select, Checkbox, RadioGroup, LocationPicker…
│   │       │   ├── cards/       # ArtisanCard, ServiceCard, RequestCard, ProposalCard, MessageBubble…
│   │       │   └── navigation/  # Options des onglets, écrans communs
│   │       ├── features/        # Modules métier
│   │       ├── lib/             # Logique pure (formatage DZD, dates, distances)
│   │       ├── hooks/
│   │       ├── i18n/            # i18next : index.ts, utils.ts, locales/fr.json, locales/ar.json
│   │       ├── services/        # Accès Supabase / API
│   │       ├── store/           # État client (Zustand)
│   │       └── theme/           # Design tokens
│   └── admin/                   # Next.js 16 (App Router) + Tailwind CSS 4
│       └── src/
│           ├── app/
│           ├── components/
│           ├── features/
│           ├── i18n/            # Dictionnaires fr / ar, locale par cookie
│           └── lib/
├── packages/
│   ├── config/                  # tsconfig et ESLint partagés
│   ├── types/                   # Types et constantes métier (rôles, statuts, locales)
│   └── validation/              # Schémas Zod partagés client / serveur
├── supabase/                    # config.toml, migrations/, functions/, seed.sql
├── .env.example
└── pnpm-workspace.yaml
```

> Expo Router supporte `src/app/` : les routes sont dans `apps/mobile/src/app/`, ce qui garde
> le code de l'application (`src/i18n`, `src/theme`…) séparé des fichiers de configuration.

## Commandes

| Commande                              | Effet                                               |
| ------------------------------------- | --------------------------------------------------- |
| `pnpm dev:mobile`                     | Démarre Metro / Expo                                |
| `pnpm dev:admin`                      | Démarre Next.js en développement (port 3000)        |
| `pnpm build:admin`                    | Build de production de l'administration             |
| `pnpm lint`                           | ESLint sur tous les workspaces                      |
| `pnpm typecheck`                      | TypeScript (`tsc --noEmit`) sur tous les workspaces |
| `pnpm test`                           | Vitest sur tous les workspaces                      |
| `pnpm format`                         | Formate le code avec Prettier                       |
| `pnpm check`                          | Format + lint + types + tests                       |
| `pnpm --filter @khedma/mobile doctor` | Diagnostic Expo (`expo-doctor`)                     |

## Internationalisation (fr / ar)

- **Mobile** : `i18next` + `react-i18next` + `expo-localization`.
  - Premier lancement : écran de choix « Français » / « العربية ».
  - Choix persisté (AsyncStorage) et modifiable à tout moment.
  - L'arabe active le RTL via `I18nManager.forceRTL`. React Native n'applique un changement de
    direction qu'au démarrage : l'application l'explique à l'utilisateur puis redémarre
    (`reloadAppAsync`). Une protection empêche toute boucle de redémarrage.
  - Clés typées : `t('cle.inexistante')` est une erreur TypeScript.
- **Admin** : dictionnaires JSON, locale stockée dans un cookie, `<html lang dir>` côté serveur.
- **Règles** :
  - Aucun texte visible codé en dur : la règle ESLint `i18next/no-literal-string` l'interdit dans le JSX.
  - Les tests vérifient que `fr.json` et `ar.json` ont exactement les mêmes clés, sans valeur vide.
  - Les schémas Zod partagés renvoient des **clés** de traduction (`validation.*`), jamais du texte.
  - Les données saisies par les utilisateurs ne sont jamais traduites automatiquement.
  - La recherche bilingue s'appuie sur `normalizeForSearch` (accents, tashkil, variantes de alef…).

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucun secret n'est versionné.

- `EXPO_PUBLIC_*` et `NEXT_PUBLIC_*` sont **publiques** (incluses dans le bundle client).
- `SUPABASE_SERVICE_ROLE_KEY` n'existe que côté serveur Next.js. Jamais dans l'application mobile.
- `pnpm cloud test app-env` crée `apps/mobile/.env` et `apps/admin/.env.local` (projet de TEST,
  valeurs publiques uniquement, sans écraser un fichier existant).
- Les deux applications **refusent de démarrer** si une clé secrète est placée à la place de la
  clé publique (`assertPublicSupabaseKey`, `@khedma/validation`).

## Authentification (mobile)

| Élément        | Mise en œuvre                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Écrans         | Accueil, inscription, connexion, mot de passe oublié, « vérifiez vos e-mails », nouveau mot de passe, déconnexion (Profil) |
| Validation     | Schémas Zod partagés (`@khedma/validation/auth`), identiques aux règles Supabase                                           |
| Mot de passe   | 8 caractères, minuscule + majuscule (latines) + chiffre ; jauge de robustesse                                              |
| Confirmation   | E-mail obligatoire avant tout accès ; lien `khedmadz://auth-callback` (Expo Go : `exp://…/--/auth-callback`)               |
| Flux des liens | PKCE : code à usage unique, échangé sur l'appareil demandeur (aucun jeton dans l'URL)                                      |
| Session        | AES-256-GCM, clé dans le Keychain / Keystore (`expo-secure-store`), jamais sauvegardée                                     |
| Expiration     | Renouvellement automatique au premier plan ; jeton révoqué → retour à la connexion avec message                            |
| Routes         | `Stack.Protected` : Particulier / Artisan inaccessibles sans session                                                       |
| Erreurs        | Codes Supabase traduits (fr / ar), sans révéler si un compte existe                                                        |
| Téléphone      | Format algérien validé et enregistré ; vérification SMS (OTP) quand un fournisseur sera configuré                          |

Modèles d'e-mails bilingues (FR + AR) : `supabase/templates/` — à coller dans le dashboard
(Authentication → Emails → Templates).

## Espaces Particulier / Artisan (KHD-006)

Un seul compte et une seule session, deux espaces (`app/particulier`, `app/artisan`). L'espace Particulier est celui par défaut.

- **Préférence** (dernier espace choisi) : stockée localement par compte, **sans valeur de sécurité**.
- **Autorisation** : rôle `ARTISAN` de `user_roles`, attribué uniquement par le serveur (trigger à la création de `artisan_profiles`). L'espace Artisan ne s'ouvre que si Supabase a confirmé ce rôle pendant la session ; hors connexion, l'utilisateur réessaie ou continue en Particulier.
- **Activation** : `account/become-artisan` → `account/artisan-setup`. Le profil artisan est créé **non publié**, donc invisible des clients jusqu'à sa complétion.
- **Sécurité serveur** : RLS et droits par colonne inchangés, testés par `supabase/tests/database/08_dual_role.test.sql` et `tests/integration/src/dual-role.test.ts`.

## Référentiel géographique (KHD-007)

69 wilayas et 1 541 communes, en français et en arabe, avec les codes officiels ONS, conformes à la loi n° 26-06 (JO n° 25 du 5 avril 2026) et au décret n° 26-206 (JO n° 40 du 3 juin 2026). Sources, licence et contrôles : [supabase/data/SOURCES.md](supabase/data/SOURCES.md).

```bash
pnpm geo:check        # valide le référentiel versionné et la migration générée (sans réseau)
pnpm geo:test-local   # PostgreSQL local jetable : migration, idempotence, relations conservées
pnpm geo:crosscheck --law <F2026025.pdf> --decree <F2026040.pdf> --ons <code_geo_2021.pdf>
```

La migration `20261121120000_geo_reference_2026.sql` est **générée** (`pnpm geo:build <dossier geoalgeria>`) : ne pas la modifier à la main.

## Choix techniques

| Sujet             | Choix                        | Justification                                                                                                     |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Expo              | SDK 58 (`expo@~58.0.26`)     | Dernière version stable. Les versions natives suivent `bundledNativeModules.json` d'Expo.                         |
| React             | **19.3.0** (mobile et admin) | Version imposée par Expo 58. Une seule version de React dans le monorepo (Next 16 accepte `^19`).                 |
| React Native      | 0.88.1                       | Version imposée par Expo 58.                                                                                      |
| TypeScript        | **~6.0.3** (pas 7.x)         | Version du template Expo 58. `typescript-eslint` exige `< 6.1`.                                                   |
| ESLint            | **9.39** (pas 10.x)          | `eslint-plugin-react` (utilisé par `eslint-config-expo` et `eslint-config-next`) ne supporte pas ESLint 10.       |
| pnpm              | `nodeLinker: hoisted`        | `node_modules` à plat : l'option la plus fiable pour l'autolinking React Native et EAS Build en monorepo.         |
| Packages partagés | Publiés en TypeScript source | Metro les compile nativement. Next.js via `transpilePackages`. Aucune étape de build.                             |
| Next.js           | 16.4 (App Router, Turbopack) | `turbopack.root` pointe sur la racine du monorepo.                                                                |
| Tailwind          | 4.3 (`@theme` CSS)           | Palette Khedma DZ déclarée en tokens CSS.                                                                         |
| Tests             | Vitest 5                     | Logique pure (validation, i18n). Les tests composants React Native viendront avec KHD-002.                        |
| Supabase CLI      | `npx supabase@3.2.0`         | Version figée, sans installation globale. Utilisée sans Docker (Supabase Cloud) via `scripts/supabase-cloud.mjs`. |
| Tests pgTAP       | `psql` + exécuteur maison    | `supabase test db` exige Docker ; chaque fichier de test s'exécute dans une transaction annulée.                  |

### Points d'attention (Windows)

- **Espace dans le chemin** (`W:\khedma dz`) : Metro et Next.js le gèrent. Les builds Android
  **locaux** (Gradle / CMake) peuvent échouer avec des espaces ou des chemins longs. Les builds
  passent par EAS (cloud), mais pour un build local, préférez un chemin court sans espace
  (ex. `W:\khedma-dz`).
- Fins de ligne normalisées en LF (`.gitattributes`, `.editorconfig`, Prettier).

## Design System (mobile)

- **Tokens** (`src/theme`) : couleurs Khedma DZ, espacements, rayons, ombres (`boxShadow`), durées.
- **Typographie** : Inter (latin) et Noto Sans Arabic (arabe), 4 graisses chacune, chargées au
  démarrage. `<Text>` choisit la police selon la langue, ou selon le contenu (un nom saisi en
  arabe s'affiche en Noto Sans Arabic même en français). Interligne plus grand pour l'arabe.
- **RTL** :
  - Mise en page en propriétés logiques (`start` / `end`, `paddingStart`, `borderTopEndRadius`…).
  - `align="start"` sur `<Text>` (gère la différence Android / iOS, voir `theme/rtl.ts`).
  - `flipInRTL` sur les icônes directionnelles (flèches, chevrons, demi-étoile).
- **Accessibilité** : rôles et états sur tous les composants interactifs, libellé obligatoire
  pour `IconButton`, zones tactiles de 48 px, animations désactivées si l'utilisateur réduit
  les animations.
- **Catalogue** : en développement, l'accueil propose « Catalogue des composants » (`/dev/ui`)
  pour vérifier chaque composant dans les deux langues. Les données affichées y sont fictives.
- **Navigation** : `particulier/` et `artisan/` sont de vrais segments d'URL (et non des groupes
  `(…)`), car les deux espaces ont des écrans de même nom (`messages`, `profil`…).

## Conventions

- TypeScript strict partout (`strict`, `noUncheckedIndexedAccess`).
- Formatage Prettier (format on save configuré dans `.vscode/settings.json`).
- Montants en DZD : toujours numériques (`NUMERIC(12,2)` en base), jamais des chaînes.
- Messages de commit : [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`…).
# khedma-dz
