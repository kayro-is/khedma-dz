-- =============================================================================
-- KHD-005 — Localisation du profil et suppression de compte
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Commune de l'utilisateur (donnée personnelle : table privée, visible du seul propriétaire).
-- La wilaya se déduit de la commune (pas de redondance).
-- -----------------------------------------------------------------------------
alter table public.profile_private
  add column commune_id integer references public.communes (id) on delete set null;

create index profile_private_commune_idx on public.profile_private (commune_id);

-- Les politiques existantes (propriétaire uniquement) s'appliquent ; seul le droit de colonne est ajouté.
grant update (commune_id) on table public.profile_private to authenticated;

-- -----------------------------------------------------------------------------
-- Suppression de son propre compte (cahier des charges §15, exigence Google Play / App Store).
-- - Refusée tant qu'une prestation est en cours (protection de l'autre partie).
-- - Les données personnelles sont supprimées en cascade (profil, données privées, rôles,
--   demandes, favoris, notifications, jetons push, profil artisan…).
-- - L'historique partagé est conservé et anonymisé (ON DELETE SET NULL : avis, prestations,
--   messages, signalements).
-- - Les fichiers Storage de l'utilisateur sont supprimés par l'application avant l'appel.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.jobs
    where (client_id = v_user or artisan_id = v_user)
      and status in ('IN_PROGRESS', 'COMPLETION_DECLARED', 'DISPUTED')
  ) then
    raise exception 'active_jobs' using errcode = 'P0001', hint = 'active_jobs';
  end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
