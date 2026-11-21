-- =============================================================================
-- KHD-003 — Notifications, préférences, jetons push, signalements, vérification, journal admin
-- =============================================================================

-- Notification interne. Le texte est rendu côté application dans la langue de l'utilisateur
-- à partir du type et des données (jamais de texte figé dans une seule langue).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  push_enabled boolean not null default true,
  new_proposal boolean not null default true,
  new_message boolean not null default true,
  proposal_updates boolean not null default true,
  job_updates boolean not null default true,
  review_updates boolean not null default true,
  new_local_requests boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  token text not null unique check (char_length(token) between 10 and 300),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason_code text not null check (reason_code in (
    'SPAM', 'FRAUD', 'ABUSE', 'INAPPROPRIATE', 'FAKE_PROFILE', 'OTHER'
  )),
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'OPEN',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un seul signalement en cours par auteur et par cible.
create unique index reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id) where status in ('OPEN', 'IN_REVIEW');
create index reports_queue_idx on public.reports (status, created_at);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null default auth.uid() references public.artisan_profiles (user_id) on delete cascade,
  -- Chemins dans le bucket privé verification-documents (<artisan_id>/...). Jamais publics.
  document_paths text[] not null check (cardinality(document_paths) between 1 and 5),
  status public.verification_request_status not null default 'PENDING',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now()
);
create unique index verification_requests_one_pending
  on public.verification_requests (artisan_id) where status = 'PENDING';

-- Journal des actions administratives : en ajout seul, alimenté par les fonctions d'administration.
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function private.set_updated_at();
create trigger reports_set_updated_at before update on public.reports
  for each row execute function private.set_updated_at();
create trigger reports_rate_limit before insert on public.reports
  for each row execute function private.enforce_rate_limit('reporter_id', '20', '24 hours');

-- Préférences par défaut créées avec le profil.
create or replace function private.create_default_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_default_preferences after insert on public.profiles
  for each row execute function private.create_default_preferences();

-- Une demande de vérification passe le profil en « en cours » (jamais en « vérifié »).
create or replace function private.on_verification_requested()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.artisan_profiles set verification_status = 'PENDING'
  where user_id = new.artisan_id and verification_status <> 'VERIFIED';
  return new;
end;
$$;
create trigger verification_requests_after_insert after insert on public.verification_requests
  for each row execute function private.on_verification_requested();

/** À appeler par les fonctions d'administration (KHD-017+) pour tracer chaque action. */
create or replace function private.log_admin_action(
  p_action text, p_target_table text, p_target_id text, p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, details)
  values (auth.uid(), p_action, p_target_table, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function private.log_admin_action(text, text, text, jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table
  public.notifications, public.notification_preferences, public.push_tokens,
  public.reports, public.verification_requests, public.admin_audit_logs
from anon, authenticated;

-- notifications : créées par le serveur ; l'utilisateur lit et marque comme lu.
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
create policy "notifications: lecture" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marquer comme lue" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on table public.notification_preferences to authenticated;
grant update (
  push_enabled, new_proposal, new_message, proposal_updates, job_updates, review_updates, new_local_requests
) on table public.notification_preferences to authenticated;
create policy "notification_preferences: lecture" on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notification_preferences: modification" on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, delete on table public.push_tokens to authenticated;
grant insert (user_id, token, platform) on table public.push_tokens to authenticated;
grant update (last_seen_at) on table public.push_tokens to authenticated;
create policy "push_tokens: lecture" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_tokens: enregistrement" on public.push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_tokens: mise à jour" on public.push_tokens
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_tokens: suppression" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

-- reports : l'auteur crée et consulte les siens ; le traitement est réservé aux administrateurs.
grant select on table public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason_code, details) on table public.reports to authenticated;
create policy "reports: lecture" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy "reports: création" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_active_user()));

-- verification_requests : soumission par l'artisan ; décision par fonction admin (KHD-018).
grant select on table public.verification_requests to authenticated;
grant insert (artisan_id, document_paths) on table public.verification_requests to authenticated;
create policy "verification_requests: lecture" on public.verification_requests
  for select to authenticated
  using (artisan_id = (select auth.uid()) or (select private.is_admin()));
create policy "verification_requests: soumission" on public.verification_requests
  for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and (select private.is_active_user())
    and (select private.has_role('ARTISAN'))
    -- Tous les documents doivent être dans le dossier privé de l'artisan.
    and not exists (
      select 1 from unnest(document_paths) p where p not like (select auth.uid())::text || '/%'
    )
  );

-- admin_audit_logs : lecture admin uniquement, aucune écriture via l'API.
grant select on table public.admin_audit_logs to authenticated;
create policy "admin_audit_logs: lecture admin" on public.admin_audit_logs
  for select to authenticated using ((select private.is_admin()));

alter publication supabase_realtime add table public.notifications;
