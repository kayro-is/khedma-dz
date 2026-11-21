-- =============================================================================
-- KHD-003 — Profils, données privées, rôles métier
-- =============================================================================

-- Profil visible des autres utilisateurs connectés (nom, photo). Aucune donnée de contact.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 60),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  status public.account_status not null default 'ACTIVE',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Données personnelles visibles uniquement par leur propriétaire (et les administrateurs).
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+213[567][0-9]{8}$'),
  phone_verified_at timestamptz,
  locale public.locale_code not null default 'fr',
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profile_private_phone_key on public.profile_private (phone) where phone is not null;

-- Rôles métier. Un utilisateur peut cumuler PARTICULIER et ARTISAN.
-- ARTISAN est attribué automatiquement à la création du profil artisan (jamais par le client).
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger profile_private_set_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (SECURITY DEFINER : lisent sans déclencher la RLS, pas de récursion)
-- -----------------------------------------------------------------------------
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'ACTIVE'
  );
$$;

create or replace function private.has_role(p_role public.business_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = p_role
  );
$$;

grant execute on function private.is_active_user() to authenticated;
grant execute on function private.has_role(public.business_role) to authenticated;

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription (métadonnées envoyées par l'app).
-- Les valeurs sont revalidées ici : le client n'est jamais cru sur parole.
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_locale public.locale_code := case when meta ->> 'locale' = 'ar' then 'ar' else 'fr' end;
  v_phone text := nullif(btrim(meta ->> 'phone'), '');
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(btrim(meta ->> 'first_name'), ''), '—'),
    coalesce(nullif(btrim(meta ->> 'last_name'), ''), '—')
  );

  insert into public.profile_private (user_id, phone, locale, terms_accepted_at)
  values (
    new.id,
    case when v_phone ~ '^\+213[567][0-9]{8}$' then v_phone end,
    v_locale,
    case when meta ->> 'terms_accepted' = 'true' then now() end
  );

  insert into public.user_roles (user_id, role) values (new.id, 'PARTICULIER');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles, public.profile_private, public.user_roles from anon, authenticated;

-- profiles : lecture des profils actifs par les utilisateurs connectés ; modification du nom/photo par soi-même.
grant select on table public.profiles to authenticated;
grant update (first_name, last_name, avatar_path) on table public.profiles to authenticated;

create policy "profiles: lecture des profils actifs" on public.profiles
  for select to authenticated
  using (status = 'ACTIVE' or id = (select auth.uid()) or (select private.is_admin()));

create policy "profiles: modification de son propre profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- profile_private : propriétaire uniquement (+ lecture admin).
grant select on table public.profile_private to authenticated;
grant update (phone, locale) on table public.profile_private to authenticated;

create policy "profile_private: lecture par le propriétaire" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "profile_private: modification par le propriétaire" on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Changer de téléphone annule sa vérification (re-vérification OTP obligatoire).
create or replace function private.reset_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  end if;
  return new;
end;
$$;
create trigger profile_private_reset_phone_verification before update on public.profile_private
  for each row execute function private.reset_phone_verification();

-- user_roles : lecture de ses propres rôles. Aucune écriture directe.
grant select on table public.user_roles to authenticated;

create policy "user_roles: lecture de ses rôles" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
