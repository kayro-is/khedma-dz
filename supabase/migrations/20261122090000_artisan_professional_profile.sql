-- =============================================================================
-- KHD-008 — Profil artisan professionnel
--   1. Publication : brouillon par défaut, contrôle serveur avant publication.
--   2. Métiers : le métier principal est toujours présent dans les services ; limite de métiers.
--   3. Zones d'intervention : limite, et jamais zéro zone pour un profil publié.
--   4. Galerie : légende facultative, ordre d'affichage, limites.
--   5. Téléphone professionnel : illisible par les autres utilisateurs.
-- Aucune donnée existante n'est supprimée ni modifiée. Les profils déjà publiés restent publiés.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Publication
-- -----------------------------------------------------------------------------
-- Un nouveau profil est un brouillon tant que l'artisan ne le publie pas explicitement.
alter table public.artisan_profiles alter column is_published set default false;

/**
 * Exigences de publication (mêmes règles que l'application, voir @khedma/validation) :
 * description d'au moins 50 caractères et au moins une zone d'intervention.
 * Nom d'activité, métier principal et commune de rattachement sont déjà obligatoires (NOT NULL).
 * Ne se déclenche que si la publication ou la description changent (les mises à jour de note
 * par le serveur ne sont pas concernées).
 */
create or replace function private.check_artisan_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published
      or new.description is distinct from old.description) then
    if char_length(btrim(coalesce(new.description, ''))) < 50 then
      raise exception 'publish_description_required' using errcode = 'P0001', hint = 'publish_description';
    end if;
    -- À la création, la commune de rattachement devient la première zone (trigger AFTER INSERT).
    if tg_op = 'UPDATE' and not exists (
      select 1 from public.artisan_service_areas z where z.artisan_id = new.user_id
    ) then
      raise exception 'publish_zone_required' using errcode = 'P0001', hint = 'publish_zone';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists artisan_profiles_check_publication on public.artisan_profiles;
create trigger artisan_profiles_check_publication
  before insert or update of is_published, description on public.artisan_profiles
  for each row execute function private.check_artisan_publication();

-- -----------------------------------------------------------------------------
-- 2. Métiers (principal + 5 secondaires au maximum)
-- -----------------------------------------------------------------------------
create or replace function private.on_artisan_primary_category_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.artisan_services (artisan_id, category_id)
  values (new.user_id, new.primary_category_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists artisan_profiles_primary_category_changed on public.artisan_profiles;
create trigger artisan_profiles_primary_category_changed
  after update of primary_category_id on public.artisan_profiles
  for each row when (old.primary_category_id is distinct from new.primary_category_id)
  execute function private.on_artisan_primary_category_changed();

/** Contrôles après insertion / suppression (déclencheurs AFTER : voient l'état final de la commande). */
create or replace function private.check_artisan_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.artisan_services s where s.artisan_id = new.artisan_id) > 6 then
      raise exception 'services_limit' using errcode = 'P0001', hint = 'services_limit';
    end if;
    return new;
  end if;
  -- Le métier principal ne peut pas être retiré des services (sauf suppression du profil).
  if exists (
    select 1 from public.artisan_profiles a
    where a.user_id = old.artisan_id and a.primary_category_id = old.category_id
  ) then
    raise exception 'primary_service_required' using errcode = 'P0001', hint = 'primary_service';
  end if;
  return old;
end;
$$;

drop trigger if exists artisan_services_check on public.artisan_services;
create trigger artisan_services_check
  after insert or delete on public.artisan_services
  for each row execute function private.check_artisan_services();

-- -----------------------------------------------------------------------------
-- 3. Zones d'intervention (50 communes au maximum ; jamais zéro si le profil est publié)
-- -----------------------------------------------------------------------------
create or replace function private.check_artisan_service_areas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.artisan_service_areas z where z.artisan_id = new.artisan_id) > 50 then
      raise exception 'zones_limit' using errcode = 'P0001', hint = 'zones_limit';
    end if;
    return new;
  end if;
  if exists (select 1 from public.artisan_profiles a where a.user_id = old.artisan_id and a.is_published)
     and not exists (select 1 from public.artisan_service_areas z where z.artisan_id = old.artisan_id) then
    raise exception 'last_zone_published' using errcode = 'P0001', hint = 'last_zone';
  end if;
  return old;
end;
$$;

drop trigger if exists artisan_service_areas_check on public.artisan_service_areas;
create trigger artisan_service_areas_check
  after insert or delete on public.artisan_service_areas
  for each row execute function private.check_artisan_service_areas();

-- -----------------------------------------------------------------------------
-- 4. Galerie : 1 photo = 1 réalisation, légende facultative, ordre d'affichage
-- -----------------------------------------------------------------------------
alter table public.portfolio_items alter column title drop not null;
alter table public.portfolio_items drop constraint if exists portfolio_items_title_check;
alter table public.portfolio_items add constraint portfolio_items_title_check
  check (title is null or char_length(btrim(title)) between 1 and 100);
alter table public.portfolio_items
  add column if not exists sort_order smallint not null default 0 check (sort_order between 0 and 999);
create index if not exists portfolio_items_artisan_order_idx on public.portfolio_items (artisan_id, sort_order);

grant insert (sort_order), update (sort_order) on table public.portfolio_items to authenticated;

create or replace function private.check_portfolio_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'portfolio_items' then
    if (select count(*) from public.portfolio_items i where i.artisan_id = new.artisan_id) > 20 then
      raise exception 'portfolio_limit' using errcode = 'P0001', hint = 'portfolio_limit';
    end if;
  elsif (select count(*) from public.portfolio_images m where m.item_id = new.item_id) > 5 then
    raise exception 'portfolio_images_limit' using errcode = 'P0001', hint = 'portfolio_images_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolio_items_limit on public.portfolio_items;
create trigger portfolio_items_limit after insert on public.portfolio_items
  for each row execute function private.check_portfolio_limits();
drop trigger if exists portfolio_images_limit on public.portfolio_images;
create trigger portfolio_images_limit after insert on public.portfolio_images
  for each row execute function private.check_portfolio_limits();

/**
 * Réorganisation de SA galerie en un seul appel : l'ordre du tableau devient l'ordre d'affichage.
 * SECURITY INVOKER : la RLS et les droits par colonne s'appliquent (seules ses réalisations).
 */
create or replace function public.reorder_my_portfolio(p_item_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.portfolio_items i
  set sort_order = o.position - 1
  from unnest(p_item_ids) with ordinality as o(id, position)
  where i.id = o.id and i.artisan_id = (select auth.uid()) and o.position <= 1000;
$$;
revoke all on function public.reorder_my_portfolio(uuid[]) from public, anon;
grant execute on function public.reorder_my_portfolio(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Téléphone professionnel : lisible uniquement par l'artisan lui-même
-- -----------------------------------------------------------------------------
-- Lecture par colonne : toutes les colonnes sauf professional_phone. L'écriture est inchangée
-- (insertion / modification de SON profil, RLS). Révélation au client : ticket ultérieur.
revoke select on table public.artisan_profiles from authenticated;
grant select (
  user_id, business_name, description, years_experience, primary_category_id,
  base_commune_id, service_radius_km, availability, is_published,
  verification_status, verified_at, rating_avg, review_count, created_at, updated_at
) on table public.artisan_profiles to authenticated;

create or replace function public.get_my_professional_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.professional_phone from public.artisan_profiles a where a.user_id = (select auth.uid());
$$;
revoke all on function public.get_my_professional_phone() from public, anon;
grant execute on function public.get_my_professional_phone() to authenticated;

-- Fonctions internes : jamais appelables via l'API.
revoke all on function
  private.check_artisan_publication(),
  private.on_artisan_primary_category_changed(),
  private.check_artisan_services(),
  private.check_artisan_service_areas(),
  private.check_portfolio_limits()
from public, anon, authenticated;
