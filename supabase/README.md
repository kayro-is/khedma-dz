# Supabase — Khedma DZ

| Élément           | Rôle                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| `config.toml`     | Configuration CLI (les réglages Auth du Cloud se font dans le dashboard).      |
| `migrations/`     | Schéma complet, versionné, appliqué dans l'ordre.                              |
| `tests/database/` | Tests pgTAP de sécurité (RLS, droits, contraintes) — `pnpm cloud test test`.   |
| `seed.sql`        | Données fictives **réservées au projet de test**.                              |
| `data/`           | Référentiel géographique officiel (69 wilayas, 1 541 communes) : `SOURCES.md`. |
| `functions/`      | Edge Functions (Deno), à partir de KHD-014 (notifications push).               |

## Commandes (Supabase Cloud, sans Docker)

Voir le README principal, section « Supabase Cloud ». En résumé :

```bash
pnpm cloud test doctor        # lecture seule
pnpm cloud test push-dry      # simulation
pnpm cloud test push --yes    # migrations + seed (projet de TEST uniquement)
pnpm cloud test test          # tests pgTAP
pnpm cloud test verify        # audit de sécurité
pnpm cloud test integration   # tests via les API
pnpm cloud test types         # types TypeScript
pnpm cloud prod push-dry      # simulation sur le projet principal (sans seed)
npx supabase@3.2.0 migration new <nom>   # nouvelle migration horodatée
```

`config.toml` n'est **pas** appliqué automatiquement au Cloud : les réglages Auth (longueur
minimale du mot de passe, URL de redirection…) se configurent dans le dashboard, ou via
`supabase config push` après validation.

## Migrations

| Fichier                                 | Contenu                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `..._foundations.sql`                   | Extensions (PostGIS, pg_trgm, unaccent), types énumérés, schéma `private`, administrateurs, normalisation de recherche fr/ar |
| `..._profiles_and_roles.sql`            | `profiles`, `profile_private`, `user_roles`, création du profil à l'inscription                                              |
| `..._geography_categories_artisans.sql` | `wilayas`, `communes`, `categories`, `artisan_profiles`, services, zones, réalisations                                       |
| `..._marketplace.sql`                   | `service_requests` (+ adresse privée, photos), `proposals`, `jobs`, `reviews`, `favorites`, limitation anti-spam             |
| `..._messaging.sql`                     | `conversations`, membres, `messages` (idempotence), `user_blocks`, `start_conversation()`, Realtime                          |
| `..._notifications_moderation.sql`      | `notifications`, préférences, jetons push, `reports`, `verification_requests`, `admin_audit_logs`                            |
| `..._storage.sql`                       | 5 buckets (taille et formats limités) et leurs politiques                                                                    |
| `..._function_privileges.sql`           | Retrait du droit EXECUTE par défaut ; seules les fonctions utilisées par la RLS restent appelables                           |

## Modèle de sécurité

- **RLS activée sur toutes les tables** exposées, avec des politiques explicites par opération.
- **Droits par colonne** (`GRANT INSERT/UPDATE (colonnes)`) : statuts, vérification, notes, dates
  de traitement ne sont **jamais** modifiables par un client, même sur ses propres lignes.
- **Schéma `private`** non exposé par l'API : fonctions d'autorisation `SECURITY DEFINER`
  (`is_admin`, `can_view_request`, `artisan_matches_request`…) avec `search_path` vide.
- **Administrateurs** : table `private.admins`, alimentée uniquement par `private.grant_admin()`
  (connexion propriétaire de la base). Le rôle affiché dans l'application n'est jamais une preuve.
- **Confidentialité** : localisation publique = commune ; adresse précise dans
  `service_request_private`, visible du demandeur et de l'artisan retenu uniquement.
  Les artisans déclarent une commune de rattachement et un rayon, jamais leur domicile.
- **Visibilité des demandes** : un artisan voit une demande ouverte seulement s'il exerce le
  métier ET intervient dans la commune (déclarée ou dans son rayon, calcul PostGIS).
- **Anti-spam** : limites par utilisateur (10 demandes/24 h, 60 propositions/24 h,
  30 messages/minute, 20 signalements/24 h), erreur `P0429`.
- **Stockage** : chemins préfixés par l'identifiant du propriétaire ; buckets privés lisibles
  uniquement via URL signées ; justificatifs lisibles par l'artisan et les administrateurs.

## Ce qui reste volontairement côté fonctions serveur (tickets suivants)

Annulation de demande (KHD-010), retrait et acceptation atomique de proposition (KHD-011/012),
transitions de prestation (KHD-015), décisions de vérification et de modération (KHD-018/019).
Le schéma l'impose déjà : ces colonnes ne sont pas modifiables via l'API.

## Comptes de démonstration (projet de TEST uniquement)

Mot de passe commun : `Khedma2026!`

| E-mail                | Rôle                                       |
| --------------------- | ------------------------------------------ |
| `amina@khedma.test`   | Particulier                                |
| `karim@khedma.test`   | Artisan plombier (Hydra), 1 avis réel      |
| `yacine@khedma.test`  | Artisan électricien (Bir El Djir)          |
| `sofiane@khedma.test` | Particulier **et** artisan peintre (Kouba) |
| `admin@khedma.test`   | Administrateur                             |
