-- Messagerie : création contrôlée, accès réservé aux membres, idempotence, blocage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

insert into public.categories (id, slug, name_fr, name_ar) values
  ('c0000000-0000-4000-8000-0000000000aa', 'test-plomberie', 'Plomberie', 'سباكة');
insert into public.wilayas (id, code, name_fr, name_ar) values (99, '99', 'Test', 'اختبار');
insert into public.communes (wilaya_id, name_fr, name_ar) values (99, 'Commune A', 'أ');

insert into auth.users (id, email, raw_user_meta_data) values
  ('c1111111-1111-4111-8111-111111111111', 'client@test.dz', '{"first_name":"C","last_name":"C"}'),
  ('a2222222-2222-4222-8222-222222222222', 'artisan@test.dz', '{"first_name":"A","last_name":"A"}'),
  ('d3333333-3333-4333-8333-333333333333', 'intrus@test.dz', '{"first_name":"I","last_name":"I"}');
insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, description, is_published) values
  ('a2222222-2222-4222-8222-222222222222', 'Artisan', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true);

create temp table ids (conversation_id uuid);
grant all on ids to authenticated;

select pg_temp.login('c1111111-1111-4111-8111-111111111111');
insert into ids select public.start_conversation('a2222222-2222-4222-8222-222222222222');

select is((select count(*)::int from public.conversation_members where conversation_id = (select conversation_id from ids)), 2,
  'un particulier démarre une conversation avec un artisan publié');
select is(public.start_conversation('a2222222-2222-4222-8222-222222222222'), (select conversation_id from ids),
  'redémarrer la conversation renvoie la même (pas de doublon)');

select lives_ok($$
  insert into public.messages (conversation_id, body, client_message_id)
  values ((select conversation_id from ids), 'Bonjour, êtes-vous disponible samedi ?', '00000000-0000-4000-8000-000000000001')
$$, 'un membre envoie un message');

select throws_ok($$
  insert into public.messages (conversation_id, body, client_message_id)
  values ((select conversation_id from ids), 'Bonjour (renvoi réseau)', '00000000-0000-4000-8000-000000000001')
$$, '23505', null, 'la clé d''idempotence empêche les doublons');

select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body, client_message_id)
  values ((select conversation_id from ids), 'a2222222-2222-4222-8222-222222222222', 'Usurpation', gen_random_uuid())
$$, '42501', null, 'impossible d''envoyer au nom d''un autre membre');

select throws_ok(
  $$ select public.start_conversation('d3333333-3333-4333-8333-333333333333') $$,
  '42501', null, 'impossible de contacter directement un particulier sans demande');
select pg_temp.logout();

select pg_temp.login('d3333333-3333-4333-8333-333333333333');
select is((select count(*)::int from public.messages where conversation_id = (select conversation_id from ids)), 0,
  'un intrus ne lit pas les messages');
select is((select count(*)::int from public.conversations where id = (select conversation_id from ids)), 0,
  'un intrus ne voit pas la conversation');
select throws_ok($$
  insert into public.messages (conversation_id, body, client_message_id)
  values ((select conversation_id from ids), 'Intrusion', gen_random_uuid())
$$, '42501', null, 'un non-membre ne peut pas écrire');
select pg_temp.logout();

select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.messages where conversation_id = (select conversation_id from ids)), 1,
  'l''autre membre reçoit le message');
insert into public.user_blocks (blocked_id) values ('c1111111-1111-4111-8111-111111111111');
select pg_temp.logout();

select pg_temp.login('c1111111-1111-4111-8111-111111111111');
select throws_ok($$
  insert into public.messages (conversation_id, body, client_message_id)
  values ((select conversation_id from ids), 'Encore moi', gen_random_uuid())
$$, '42501', null, 'un utilisateur bloqué ne peut plus écrire');
select is((select count(*)::int from public.user_blocks), 0, 'on ne voit pas qui nous a bloqué');
select pg_temp.logout();

select * from finish();
rollback;
