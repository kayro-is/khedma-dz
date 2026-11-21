-- =============================================================================
-- KHD-003 — Messagerie : conversations, membres, messages, blocages
-- =============================================================================

create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Conversation liée à une demande (devis) ou directe (contact d'un artisan).
  request_id uuid references public.service_requests (id) on delete set null,
  -- Clé d'unicité : paire d'utilisateurs triée + demande éventuelle.
  pair_key text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text check (body is null or char_length(btrim(body)) between 1 and 4000),
  -- Chemin dans le bucket privé message-attachments : <conversation_id>/<sender_id>/<fichier>
  attachment_path text,
  attachment_mime text check (attachment_mime is null or attachment_mime in (
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
  )),
  -- Clé d'idempotence générée par l'application : un renvoi ne crée pas de doublon.
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_path is not null),
  check ((attachment_path is null) = (attachment_mime is null)),
  unique (sender_id, client_message_id)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.enforce_rate_limit('sender_id', '30', '1 minute');

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation
-- -----------------------------------------------------------------------------
create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

/** Vrai si un autre membre de la conversation a bloqué l'utilisateur courant (ou l'inverse). */
create or replace function private.conversation_is_blocked(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation_id
      and m.user_id <> (select auth.uid())
      and private.is_blocked_between(m.user_id, (select auth.uid()))
  );
$$;

grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.conversation_is_blocked(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Démarrer (ou retrouver) une conversation. Seule voie de création : membres créés atomiquement.
-- Autorisé si l'interlocuteur est un artisan public, ou si les deux parties sont liées à la demande.
-- -----------------------------------------------------------------------------
create or replace function public.start_conversation(p_other_user_id uuid, p_request_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_id uuid;
  v_request public.service_requests;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'invalid_participant' using errcode = '22023';
  end if;
  if not private.is_active_user() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id and status = 'ACTIVE') then
    raise exception 'participant_unavailable' using errcode = '42501';
  end if;
  if private.is_blocked_between(v_me, p_other_user_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  if p_request_id is not null then
    select * into v_request from public.service_requests where id = p_request_id;
    if v_request.id is null or not (
      -- Le demandeur contacte un artisan ayant fait une proposition.
      (v_request.client_id = v_me and exists (
        select 1 from public.proposals where request_id = p_request_id and artisan_id = p_other_user_id))
      -- Un artisan qui voit la demande contacte son auteur.
      or (v_request.client_id = p_other_user_id and private.can_view_request(p_request_id))
    ) then
      raise exception 'conversation_not_allowed' using errcode = '42501';
    end if;
  -- Sans demande : seul un artisan publié peut être contacté directement (pas de démarchage).
  elsif not private.is_public_artisan(p_other_user_id) then
    raise exception 'conversation_not_allowed' using errcode = '42501';
  end if;

  v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text)
    || ':' || coalesce(p_request_id::text, '-');

  insert into public.conversations (request_id, pair_key, created_by)
  values (p_request_id, v_key, v_me)
  on conflict (pair_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations where pair_key = v_key;
  else
    insert into public.conversation_members (conversation_id, user_id)
    values (v_id, v_me), (v_id, p_other_user_id);
  end if;
  return v_id;
end;
$$;
revoke all on function public.start_conversation(uuid, uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- Horodatage du dernier message (tri de la liste des conversations).
create or replace function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end;
$$;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function private.touch_conversation();

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.user_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

revoke all on table public.user_blocks, public.conversations, public.conversation_members, public.messages
from anon, authenticated;

grant select, delete on table public.user_blocks to authenticated;
grant insert (blocker_id, blocked_id) on table public.user_blocks to authenticated;
create policy "user_blocks: lecture de ses blocages" on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "user_blocks: bloquer" on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "user_blocks: débloquer" on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

grant select on table public.conversations to authenticated;
create policy "conversations: lecture par les membres" on public.conversations
  for select to authenticated
  using (private.is_conversation_member(id) or (select private.is_admin()));

grant select on table public.conversation_members to authenticated;
grant update (last_read_at) on table public.conversation_members to authenticated;
create policy "conversation_members: lecture par les membres" on public.conversation_members
  for select to authenticated
  using (private.is_conversation_member(conversation_id) or (select private.is_admin()));
create policy "conversation_members: marquer comme lu" on public.conversation_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on table public.messages to authenticated;
grant insert (conversation_id, sender_id, body, attachment_path, attachment_mime, client_message_id)
  on table public.messages to authenticated;
create policy "messages: lecture par les membres" on public.messages
  for select to authenticated
  using (private.is_conversation_member(conversation_id) or (select private.is_admin()));
create policy "messages: envoi par un membre non bloqué" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select private.is_active_user())
    and private.is_conversation_member(conversation_id)
    and not private.conversation_is_blocked(conversation_id)
    and (
      attachment_path is null
      or attachment_path like conversation_id::text || '/' || (select auth.uid())::text || '/%'
    )
  );

-- Temps réel : Supabase Realtime applique la RLS aux changements diffusés.
alter publication supabase_realtime add table public.messages;
