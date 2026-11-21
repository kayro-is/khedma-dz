-- =============================================================================
-- KHD-003 — Marketplace : demandes, propositions, prestations, avis, favoris
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Limitation de débit générique (anti-spam). Arguments du trigger :
--   0 = colonne propriétaire, 1 = nombre maximal, 2 = fenêtre (intervalle PostgreSQL)
-- -----------------------------------------------------------------------------
create or replace function private.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_count integer;
begin
  execute format('select ($1).%I', tg_argv[0]) into v_owner using new;
  if v_owner is null then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, tg_argv[0]
  ) into v_count using v_owner, tg_argv[2];
  if v_count >= tg_argv[1]::integer then
    raise exception 'rate_limit_exceeded' using errcode = 'P0429',
      hint = format('%s / %s', tg_argv[1], tg_argv[2]);
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Demandes de prestation
-- -----------------------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 2000),
  -- Localisation publique = commune uniquement. L'adresse est dans service_request_private.
  commune_id integer not null references public.communes (id) on delete restrict,
  budget_amount numeric(12, 2) check (budget_amount is null or budget_amount > 0),
  urgency public.request_urgency not null default 'NORMAL',
  status public.service_request_status not null default 'OPEN',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_client_idx on public.service_requests (client_id, created_at desc);
create index service_requests_open_idx on public.service_requests (category_id, commune_id, created_at desc)
  where status = 'OPEN';

create table public.service_request_private (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  address_details text check (address_details is null or char_length(address_details) <= 300),
  location extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index request_images_request_idx on public.request_images (request_id);

-- -----------------------------------------------------------------------------
-- Propositions (devis)
-- -----------------------------------------------------------------------------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  artisan_id uuid not null default auth.uid() references public.artisan_profiles (user_id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  estimated_days smallint not null check (estimated_days between 1 and 365),
  conditions text check (conditions is null or char_length(conditions) <= 1000),
  status public.proposal_status not null default 'PENDING',
  responded_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Une seule proposition active (en attente ou acceptée) par artisan et par demande.
create unique index proposals_one_active_per_artisan
  on public.proposals (request_id, artisan_id) where status in ('PENDING', 'ACCEPTED');
-- Une seule proposition acceptée par demande.
create unique index proposals_one_accepted_per_request
  on public.proposals (request_id) where status = 'ACCEPTED';
create index proposals_artisan_idx on public.proposals (artisan_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Prestations (créées uniquement par l'acceptation atomique d'une proposition, KHD-012)
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.service_requests (id) on delete set null,
  proposal_id uuid unique references public.proposals (id) on delete set null,
  -- Conservées en cas de suppression de compte (historique de l'autre partie).
  client_id uuid references public.profiles (id) on delete set null,
  artisan_id uuid references public.profiles (id) on delete set null,
  agreed_amount numeric(12, 2) not null check (agreed_amount > 0),
  status public.job_status not null default 'IN_PROGRESS',
  completion_declared_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id is null or artisan_id is null or client_id <> artisan_id)
);
create index jobs_client_idx on public.jobs (client_id, created_at desc);
create index jobs_artisan_idx on public.jobs (artisan_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Avis : uniquement après une prestation terminée, un seul par prestation, jamais sur soi-même.
-- -----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  artisan_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1500),
  artisan_reply text check (artisan_reply is null or char_length(artisan_reply) <= 1500),
  artisan_replied_at timestamptz,
  status public.review_status not null default 'PUBLISHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (author_id is null or author_id <> artisan_id)
);
create index reviews_artisan_idx on public.reviews (artisan_id, created_at desc) where status = 'PUBLISHED';

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  artisan_id uuid not null references public.artisan_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artisan_id)
);
create index favorites_artisan_idx on public.favorites (artisan_id);

create trigger service_requests_set_updated_at before update on public.service_requests
  for each row execute function private.set_updated_at();
create trigger service_request_private_set_updated_at before update on public.service_request_private
  for each row execute function private.set_updated_at();
create trigger proposals_set_updated_at before update on public.proposals
  for each row execute function private.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();

create trigger service_requests_rate_limit before insert on public.service_requests
  for each row execute function private.enforce_rate_limit('client_id', '10', '24 hours');
create trigger proposals_rate_limit before insert on public.proposals
  for each row execute function private.enforce_rate_limit('artisan_id', '60', '24 hours');

-- Maximum 6 photos par demande.
create or replace function private.limit_request_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.request_images where request_id = new.request_id) >= 6 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger request_images_limit before insert on public.request_images
  for each row execute function private.limit_request_images();

-- -----------------------------------------------------------------------------
-- Visibilité d'une demande
-- -----------------------------------------------------------------------------
/** L'artisan courant exerce le métier de la demande ET intervient dans sa zone (commune ou rayon). */
create or replace function private.artisan_matches_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.service_requests r
    join public.artisan_profiles a on a.user_id = (select auth.uid())
    join public.profiles p on p.id = a.user_id and p.status = 'ACTIVE'
    where r.id = p_request_id
      and r.client_id <> a.user_id
      and exists (
        select 1 from public.artisan_services s
        where s.artisan_id = a.user_id and s.category_id = r.category_id
      )
      and (
        exists (
          select 1 from public.artisan_service_areas z
          where z.artisan_id = a.user_id and z.commune_id = r.commune_id
        )
        or exists (
          select 1
          from public.communes base, public.communes target
          where base.id = a.base_commune_id and target.id = r.commune_id
            and base.centroid is not null and target.centroid is not null
            and extensions.st_dwithin(base.centroid, target.centroid, a.service_radius_km * 1000)
        )
      )
  );
$$;

create or replace function private.can_view_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_admin())
    or exists (select 1 from public.service_requests r where r.id = p_request_id and r.client_id = (select auth.uid()))
    or exists (select 1 from public.jobs j where j.request_id = p_request_id and j.artisan_id = (select auth.uid()))
    or exists (select 1 from public.proposals pr where pr.request_id = p_request_id and pr.artisan_id = (select auth.uid()))
    or (
      exists (select 1 from public.service_requests r where r.id = p_request_id and r.status = 'OPEN')
      and private.artisan_matches_request(p_request_id)
    );
$$;

/** Adresse précise : propriétaire et artisan retenu uniquement. */
create or replace function private.can_view_request_private(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.service_requests r where r.id = p_request_id and r.client_id = (select auth.uid()))
    or exists (
      select 1 from public.jobs j
      where j.request_id = p_request_id and j.artisan_id = (select auth.uid())
        and j.status in ('IN_PROGRESS', 'COMPLETION_DECLARED')
    );
$$;

grant execute on function private.artisan_matches_request(uuid) to authenticated;
grant execute on function private.can_view_request(uuid) to authenticated;
grant execute on function private.can_view_request_private(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Avis : auteur et artisan déduits de la prestation (jamais fournis par le client) + agrégats.
-- -----------------------------------------------------------------------------
create or replace function private.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = new.job_id;
  if v_job.id is null or v_job.status <> 'COMPLETED' or v_job.client_id is distinct from auth.uid() then
    raise exception 'review_not_allowed' using errcode = '42501';
  end if;
  new.author_id := auth.uid();
  new.artisan_id := v_job.artisan_id;
  return new;
end;
$$;
create trigger reviews_prepare before insert on public.reviews
  for each row execute function private.prepare_review();

create or replace function private.stamp_review_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.artisan_reply is distinct from old.artisan_reply then
    new.artisan_replied_at := case when new.artisan_reply is null then null else now() end;
  end if;
  return new;
end;
$$;
create trigger reviews_stamp_reply before update on public.reviews
  for each row execute function private.stamp_review_reply();

/** Note moyenne et nombre d'avis réels (publiés uniquement). */
create or replace function private.refresh_artisan_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := coalesce(new.artisan_id, old.artisan_id);
begin
  update public.artisan_profiles a
  set rating_avg = s.avg_rating, review_count = s.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*)::integer as cnt
    from public.reviews where artisan_id = v_artisan and status = 'PUBLISHED'
  ) s
  where a.user_id = v_artisan;
  return null;
end;
$$;
create trigger reviews_refresh_rating after insert or update of rating, status or delete on public.reviews
  for each row execute function private.refresh_artisan_rating();

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.service_requests enable row level security;
alter table public.service_request_private enable row level security;
alter table public.request_images enable row level security;
alter table public.proposals enable row level security;
alter table public.jobs enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

revoke all on table
  public.service_requests, public.service_request_private, public.request_images,
  public.proposals, public.jobs, public.reviews, public.favorites
from anon, authenticated;

-- service_requests : statut jamais modifiable directement (annulation, attribution : fonctions serveur).
grant select on table public.service_requests to authenticated;
grant insert (client_id, category_id, title, description, commune_id, budget_amount, urgency)
  on table public.service_requests to authenticated;
grant update (category_id, title, description, commune_id, budget_amount, urgency)
  on table public.service_requests to authenticated;

create policy "service_requests: lecture" on public.service_requests
  for select to authenticated using (private.can_view_request(id));
create policy "service_requests: création" on public.service_requests
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and (select private.is_active_user())
    and (select private.has_role('PARTICULIER'))
  );
create policy "service_requests: modification tant qu'ouverte" on public.service_requests
  for update to authenticated
  using (client_id = (select auth.uid()) and status = 'OPEN')
  with check (client_id = (select auth.uid()) and status = 'OPEN');

grant select on table public.service_request_private to authenticated;
grant insert (request_id, address_details, location) on table public.service_request_private to authenticated;
grant update (address_details, location) on table public.service_request_private to authenticated;

create policy "service_request_private: lecture restreinte" on public.service_request_private
  for select to authenticated using (private.can_view_request_private(request_id));
create policy "service_request_private: création par le demandeur" on public.service_request_private
  for insert to authenticated
  with check (exists (
    select 1 from public.service_requests r where r.id = request_id and r.client_id = (select auth.uid())
  ));
create policy "service_request_private: modification par le demandeur" on public.service_request_private
  for update to authenticated
  using (exists (
    select 1 from public.service_requests r
    where r.id = request_id and r.client_id = (select auth.uid()) and r.status = 'OPEN'
  ));

grant select, delete on table public.request_images to authenticated;
grant insert (request_id, storage_path, sort_order) on table public.request_images to authenticated;

create policy "request_images: lecture" on public.request_images
  for select to authenticated using (private.can_view_request(request_id));
create policy "request_images: ajout" on public.request_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.client_id = (select auth.uid()) and r.status = 'OPEN'
    )
    and storage_path like (select auth.uid())::text || '/' || request_id::text || '/%'
  );
create policy "request_images: suppression" on public.request_images
  for delete to authenticated
  using (exists (
    select 1 from public.service_requests r
    where r.id = request_id and r.client_id = (select auth.uid()) and r.status = 'OPEN'
  ));

-- proposals : création par un artisan compatible ; modification tant qu'en attente.
-- Retrait, acceptation, refus : fonctions serveur (KHD-011 / KHD-012).
grant select on table public.proposals to authenticated;
grant insert (request_id, artisan_id, amount, message, estimated_days, conditions)
  on table public.proposals to authenticated;
grant update (amount, message, estimated_days, conditions) on table public.proposals to authenticated;

create policy "proposals: lecture" on public.proposals
  for select to authenticated
  using (
    artisan_id = (select auth.uid())
    or exists (select 1 from public.service_requests r where r.id = request_id and r.client_id = (select auth.uid()))
    or (select private.is_admin())
  );
create policy "proposals: création par un artisan compatible" on public.proposals
  for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and (select private.is_active_user())
    and (select private.has_role('ARTISAN'))
    and exists (select 1 from public.service_requests r where r.id = request_id and r.status = 'OPEN')
    and private.artisan_matches_request(request_id)
  );
create policy "proposals: modification tant qu'en attente" on public.proposals
  for update to authenticated
  using (artisan_id = (select auth.uid()) and status = 'PENDING')
  with check (artisan_id = (select auth.uid()) and status = 'PENDING');

-- jobs : lecture par les deux parties. Aucune écriture directe.
grant select on table public.jobs to authenticated;
create policy "jobs: lecture par les parties" on public.jobs
  for select to authenticated
  using (client_id = (select auth.uid()) or artisan_id = (select auth.uid()) or (select private.is_admin()));

-- reviews
grant select on table public.reviews to authenticated;
grant insert (job_id, rating, comment) on table public.reviews to authenticated;
grant update (artisan_reply) on table public.reviews to authenticated;

create policy "reviews: lecture" on public.reviews
  for select to authenticated
  using (
    (status = 'PUBLISHED' and private.is_public_artisan(artisan_id))
    or author_id = (select auth.uid())
    or artisan_id = (select auth.uid())
    or (select private.is_admin())
  );
create policy "reviews: création après prestation terminée" on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.is_active_user())
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.client_id = (select auth.uid()) and j.status = 'COMPLETED'
    )
  );
create policy "reviews: réponse de l'artisan" on public.reviews
  for update to authenticated
  using (artisan_id = (select auth.uid()))
  with check (artisan_id = (select auth.uid()));

-- favorites
grant select, delete on table public.favorites to authenticated;
grant insert (user_id, artisan_id) on table public.favorites to authenticated;

create policy "favorites: lecture" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: ajout" on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()) and artisan_id <> (select auth.uid()));
create policy "favorites: suppression" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));
