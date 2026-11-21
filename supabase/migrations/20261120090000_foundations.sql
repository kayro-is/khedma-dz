-- =============================================================================
-- KHD-003 — Fondations : extensions, types énumérés, schéma privé, fonctions utilitaires
-- =============================================================================
-- Conventions :
--   * Toutes les tables exposées (schéma public) ont la RLS activée.
--   * Les droits sont accordés explicitement colonne par colonne (GRANT) : un utilisateur
--     ne peut jamais modifier un statut, une vérification ou une note directement.
--   * Les transitions sensibles passent par des fonctions SECURITY DEFINER.
--   * Le schéma `private` n'est pas exposé par l'API (PostgREST n'expose que `public`).
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Types énumérés (alignés sur packages/types/src/domain.ts)
-- -----------------------------------------------------------------------------
create type public.business_role as enum ('PARTICULIER', 'ARTISAN');
create type public.account_status as enum ('ACTIVE', 'SUSPENDED');
create type public.locale_code as enum ('fr', 'ar');
create type public.service_request_status as enum (
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'
);
create type public.proposal_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
create type public.request_urgency as enum ('LOW', 'NORMAL', 'URGENT');
create type public.job_status as enum (
  'IN_PROGRESS', 'COMPLETION_DECLARED', 'COMPLETED', 'DISPUTED', 'CANCELLED'
);
create type public.artisan_availability as enum ('AVAILABLE', 'BUSY', 'UNAVAILABLE');
create type public.verification_status as enum ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
create type public.verification_request_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.review_status as enum ('PUBLISHED', 'HIDDEN');
create type public.report_target as enum (
  'USER', 'ARTISAN_PROFILE', 'SERVICE_REQUEST', 'REVIEW', 'MESSAGE', 'CONVERSATION'
);
create type public.report_status as enum ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
create type public.notification_type as enum (
  'NEW_PROPOSAL', 'PROPOSAL_UPDATED', 'PROPOSAL_ACCEPTED', 'NEW_MESSAGE', 'NEW_LOCAL_REQUEST',
  'JOB_COMPLETION_DECLARED', 'JOB_COMPLETED', 'REVIEW_REQUEST', 'NEW_REVIEW', 'VERIFICATION_RESULT',
  'SYSTEM'
);

-- -----------------------------------------------------------------------------
-- Administrateurs : table non exposée, alimentée uniquement par procédure serveur.
-- -----------------------------------------------------------------------------
create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
revoke all on table private.admins from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

/** Vrai si l'utilisateur courant est administrateur. Le rôle actif côté interface n'est jamais une preuve. */
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins a where a.user_id = (select auth.uid()));
$$;

/**
 * Attribution du rôle administrateur : exécutable uniquement par le propriétaire de la base
 * (migration, console SQL, script serveur avec la connexion postgres). Jamais par l'API.
 */
create or replace function private.grant_admin(p_user_id uuid, p_granted_by uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.admins (user_id, granted_by) values (p_user_id, p_granted_by)
  on conflict (user_id) do nothing;
$$;
revoke all on function private.grant_admin(uuid, uuid) from public, anon, authenticated, service_role;

/** Normalisation de recherche bilingue, identique à `normalizeForSearch` côté mobile. */
create or replace function private.normalize_search(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(lower(
    translate(
      regexp_replace(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')),
        '[ؐ-ًؚ-ٰٟۖ-ۭـ]', '', 'g'),
      'آأإٱىةؤئ', 'اااايهوي')
  ), '\s+', ' ', 'g'));
$$;

grant execute on function private.is_admin() to authenticated, anon;
grant execute on function private.normalize_search(text) to authenticated, anon;
