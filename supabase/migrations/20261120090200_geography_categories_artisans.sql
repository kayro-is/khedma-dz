-- =============================================================================
-- KHD-003 — Géographie, catégories, profils artisans
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Géographie. Les données de référence sont importées depuis une source officielle (KHD-007).
-- Aucun nombre de wilayas n'est figé dans le schéma : le découpage administratif peut évoluer.
-- -----------------------------------------------------------------------------
create table public.wilayas (
  id smallint primary key check (id between 1 and 99),
  code text not null unique check (code ~ '^[0-9]{2}$'),
  name_fr text not null,
  name_ar text not null,
  -- Point de référence approximatif (chef-lieu), pour les distances indicatives.
  centroid extensions.geography(point, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.communes (
  id integer generated always as identity primary key,
  wilaya_id smallint not null references public.wilayas (id) on delete restrict,
  -- Code officiel (ONS) lorsqu'il est connu ; jamais inventé.
  official_code text unique,
  name_fr text not null,
  name_ar text not null,
  centroid extensions.geography(point, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wilaya_id, name_fr)
);
create index communes_wilaya_idx on public.communes (wilaya_id);
create index communes_centroid_idx on public.communes using gist (centroid);
create index communes_name_search_idx on public.communes
  using gin ((private.normalize_search(name_fr) || ' ' || private.normalize_search(name_ar)) extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Catégories (métiers), administrables.
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name_fr text not null check (char_length(name_fr) between 2 and 60),
  name_ar text not null check (char_length(name_ar) between 2 and 60),
  -- Synonymes de recherche, y compris darija (ex. « plombi », « بلومبي »).
  search_terms text[] not null default '{}',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Profils artisans
-- -----------------------------------------------------------------------------
create table public.artisan_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 2000),
  years_experience smallint check (years_experience between 0 and 70),
  primary_category_id uuid not null references public.categories (id) on delete restrict,
  professional_phone text check (professional_phone is null or professional_phone ~ '^\+213[0-9]{8,9}$'),
  -- Zone déclarée (commune de rattachement) : jamais l'adresse du domicile.
  base_commune_id integer not null references public.communes (id) on delete restrict,
  service_radius_km smallint not null default 15 check (service_radius_km between 1 and 200),
  availability public.artisan_availability not null default 'AVAILABLE',
  is_published boolean not null default true,
  -- Champs gérés exclusivement par le serveur :
  verification_status public.verification_status not null default 'UNVERIFIED',
  verified_at timestamptz,
  rating_avg numeric(3, 2) check (rating_avg is null or rating_avg between 1 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artisan_profiles_category_idx on public.artisan_profiles (primary_category_id);
create index artisan_profiles_commune_idx on public.artisan_profiles (base_commune_id);
create index artisan_profiles_name_search_idx on public.artisan_profiles
  using gin (private.normalize_search(business_name) extensions.gin_trgm_ops);

-- Métiers exercés (principal + secondaires) et prix indicatif éventuel.
create table public.artisan_services (
  artisan_id uuid not null references public.artisan_profiles (user_id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  price_from numeric(12, 2) check (price_from is null or price_from > 0),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  primary key (artisan_id, category_id)
);
create index artisan_services_category_idx on public.artisan_services (category_id);

-- Communes d'intervention déclarées.
create table public.artisan_service_areas (
  artisan_id uuid not null references public.artisan_profiles (user_id) on delete cascade,
  commune_id integer not null references public.communes (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (artisan_id, commune_id)
);
create index artisan_service_areas_commune_idx on public.artisan_service_areas (commune_id);

-- Réalisations (galerie).
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisan_profiles (user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  category_id uuid references public.categories (id) on delete set null,
  done_on date check (done_on is null or done_on <= current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_items_artisan_idx on public.portfolio_items (artisan_id);

create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index portfolio_images_item_idx on public.portfolio_images (item_id);

create trigger wilayas_set_updated_at before update on public.wilayas
  for each row execute function private.set_updated_at();
create trigger communes_set_updated_at before update on public.communes
  for each row execute function private.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger artisan_profiles_set_updated_at before update on public.artisan_profiles
  for each row execute function private.set_updated_at();
create trigger portfolio_items_set_updated_at before update on public.portfolio_items
  for each row execute function private.set_updated_at();

-- Créer un profil artisan attribue le rôle ARTISAN et le métier principal.
create or replace function private.on_artisan_profile_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role) values (new.user_id, 'ARTISAN')
  on conflict do nothing;
  insert into public.artisan_services (artisan_id, category_id) values (new.user_id, new.primary_category_id)
  on conflict do nothing;
  insert into public.artisan_service_areas (artisan_id, commune_id) values (new.user_id, new.base_commune_id)
  on conflict do nothing;
  return new;
end;
$$;
create trigger artisan_profiles_after_insert after insert on public.artisan_profiles
  for each row execute function private.on_artisan_profile_created();

/** Vrai si l'artisan est visible publiquement (publié et compte actif). */
create or replace function private.is_public_artisan(p_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artisan_profiles a
    join public.profiles p on p.id = a.user_id
    where a.user_id = p_artisan_id and a.is_published and p.status = 'ACTIVE'
  );
$$;
grant execute on function private.is_public_artisan(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.wilayas enable row level security;
alter table public.communes enable row level security;
alter table public.categories enable row level security;
alter table public.artisan_profiles enable row level security;
alter table public.artisan_services enable row level security;
alter table public.artisan_service_areas enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.portfolio_images enable row level security;

revoke all on table
  public.wilayas, public.communes, public.categories, public.artisan_profiles,
  public.artisan_services, public.artisan_service_areas, public.portfolio_items, public.portfolio_images
from anon, authenticated;

-- Référentiels : lecture publique (y compris non connecté, pour l'inscription). Écriture : admin (KHD-017).
grant select on table public.wilayas, public.communes, public.categories to anon, authenticated;

create policy "wilayas: lecture" on public.wilayas
  for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy "communes: lecture" on public.communes
  for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy "categories: lecture" on public.categories
  for select to anon, authenticated using (is_active or (select private.is_admin()));

-- artisan_profiles : lecture des profils publiés par les utilisateurs connectés.
grant select on table public.artisan_profiles to authenticated;
grant insert (
  user_id, business_name, description, years_experience, primary_category_id,
  professional_phone, base_commune_id, service_radius_km, availability, is_published
) on table public.artisan_profiles to authenticated;
grant update (
  business_name, description, years_experience, primary_category_id,
  professional_phone, base_commune_id, service_radius_km, availability, is_published
) on table public.artisan_profiles to authenticated;

create policy "artisan_profiles: lecture" on public.artisan_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or private.is_public_artisan(user_id)
  );
create policy "artisan_profiles: création de son profil" on public.artisan_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_user()));
create policy "artisan_profiles: modification de son profil" on public.artisan_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tables filles : lecture si l'artisan est visible ; écriture par l'artisan lui-même.
grant select, delete on table public.artisan_services, public.artisan_service_areas to authenticated;
grant insert (artisan_id, category_id, price_from, description) on table public.artisan_services to authenticated;
grant update (price_from, description) on table public.artisan_services to authenticated;
grant insert (artisan_id, commune_id) on table public.artisan_service_areas to authenticated;

create policy "artisan_services: lecture" on public.artisan_services
  for select to authenticated
  using (artisan_id = (select auth.uid()) or private.is_public_artisan(artisan_id) or (select private.is_admin()));
create policy "artisan_services: ajout" on public.artisan_services
  for insert to authenticated with check (artisan_id = (select auth.uid()));
create policy "artisan_services: modification" on public.artisan_services
  for update to authenticated
  using (artisan_id = (select auth.uid())) with check (artisan_id = (select auth.uid()));
create policy "artisan_services: suppression" on public.artisan_services
  for delete to authenticated using (artisan_id = (select auth.uid()));

create policy "artisan_service_areas: lecture" on public.artisan_service_areas
  for select to authenticated
  using (artisan_id = (select auth.uid()) or private.is_public_artisan(artisan_id) or (select private.is_admin()));
create policy "artisan_service_areas: ajout" on public.artisan_service_areas
  for insert to authenticated with check (artisan_id = (select auth.uid()));
create policy "artisan_service_areas: suppression" on public.artisan_service_areas
  for delete to authenticated using (artisan_id = (select auth.uid()));

grant select, delete on table public.portfolio_items, public.portfolio_images to authenticated;
grant insert (artisan_id, title, description, category_id, done_on) on table public.portfolio_items to authenticated;
grant update (title, description, category_id, done_on) on table public.portfolio_items to authenticated;
grant insert (item_id, storage_path, sort_order) on table public.portfolio_images to authenticated;
grant update (sort_order) on table public.portfolio_images to authenticated;

create policy "portfolio_items: lecture" on public.portfolio_items
  for select to authenticated
  using (artisan_id = (select auth.uid()) or private.is_public_artisan(artisan_id) or (select private.is_admin()));
create policy "portfolio_items: ajout" on public.portfolio_items
  for insert to authenticated
  with check (artisan_id = (select auth.uid()) and (select private.has_role('ARTISAN')));
create policy "portfolio_items: modification" on public.portfolio_items
  for update to authenticated
  using (artisan_id = (select auth.uid())) with check (artisan_id = (select auth.uid()));
create policy "portfolio_items: suppression" on public.portfolio_items
  for delete to authenticated using (artisan_id = (select auth.uid()));

-- Les images héritent de la visibilité de leur réalisation (RLS appliquée dans la sous-requête).
create policy "portfolio_images: lecture" on public.portfolio_images
  for select to authenticated
  using (exists (select 1 from public.portfolio_items i where i.id = item_id));
create policy "portfolio_images: ajout" on public.portfolio_images
  for insert to authenticated
  with check (
    exists (select 1 from public.portfolio_items i where i.id = item_id and i.artisan_id = (select auth.uid()))
    and storage_path like (select auth.uid())::text || '/%'
  );
create policy "portfolio_images: modification" on public.portfolio_images
  for update to authenticated
  using (exists (select 1 from public.portfolio_items i where i.id = item_id and i.artisan_id = (select auth.uid())));
create policy "portfolio_images: suppression" on public.portfolio_images
  for delete to authenticated
  using (exists (select 1 from public.portfolio_items i where i.id = item_id and i.artisan_id = (select auth.uid())));
