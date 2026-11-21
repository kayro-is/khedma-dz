-- Demandes, visibilité par métier et zone, adresse privée, propositions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Référentiels de test : deux communes proches (~4 km), une lointaine (~400 km).
insert into public.categories (id, slug, name_fr, name_ar) values
  ('c0000000-0000-4000-8000-0000000000aa', 'test-plomberie', 'Plomberie', 'سباكة'),
  ('c0000000-0000-4000-8000-0000000000bb', 'test-electricite', 'Électricité', 'كهرباء');
insert into public.wilayas (id, code, name_fr, name_ar) values (99, '99', 'Test', 'اختبار');
insert into public.communes (wilaya_id, name_fr, name_ar, centroid) values
  (99, 'Proche A', 'أ', 'SRID=4326;POINT(3.00 36.70)'),
  (99, 'Proche B', 'ب', 'SRID=4326;POINT(3.04 36.71)'),
  (99, 'Lointaine', 'ج', 'SRID=4326;POINT(7.50 36.50)');

-- client, plombier proche, électricien proche, plombier lointain, curieux sans rôle artisan
insert into auth.users (id, email, raw_user_meta_data) values
  ('c1111111-1111-4111-8111-111111111111', 'client@test.dz', '{"first_name":"C","last_name":"C"}'),
  ('a2222222-2222-4222-8222-222222222222', 'plombier@test.dz', '{"first_name":"P","last_name":"P"}'),
  ('a3333333-3333-4333-8333-333333333333', 'elec@test.dz', '{"first_name":"E","last_name":"E"}'),
  ('a4444444-4444-4444-8444-444444444444', 'loin@test.dz', '{"first_name":"L","last_name":"L"}'),
  ('d5555555-5555-4555-8555-555555555555', 'autre@test.dz', '{"first_name":"O","last_name":"O"}');

insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, service_radius_km, description, is_published) values
  ('a2222222-2222-4222-8222-222222222222', 'Plombier proche', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Proche B'), 10, 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true),
  ('a3333333-3333-4333-8333-333333333333', 'Électricien proche', 'c0000000-0000-4000-8000-0000000000bb',
    (select id from public.communes where name_fr = 'Proche B'), 10, 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true),
  ('a4444444-4444-4444-8444-444444444444', 'Plombier lointain', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Lointaine'), 20, 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true);

-- ---------------------------------------------------------------- Création de la demande
select pg_temp.login('c1111111-1111-4111-8111-111111111111');

select throws_ok($$
  insert into public.service_requests (category_id, title, description, commune_id, status)
  values ('c0000000-0000-4000-8000-0000000000aa', 'Fuite cuisine', 'Une fuite importante sous l''évier.',
    (select id from public.communes where name_fr = 'Proche A'), 'ASSIGNED')
$$, '42501', null, 'impossible de choisir le statut d''une demande');

-- L'identifiant est généré par la base (le client ne peut pas le choisir).
select lives_ok($$
  insert into public.service_requests (category_id, title, description, commune_id, budget_amount)
  values ('c0000000-0000-4000-8000-0000000000aa', 'Fuite cuisine',
    'Une fuite importante sous l''évier.', (select id from public.communes where name_fr = 'Proche A'), 5000)
$$, 'un particulier publie une demande');

select throws_ok($$
  insert into public.service_requests (id, category_id, title, description, commune_id)
  values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000aa', 'Identifiant imposé',
    'Tentative de choisir soi-même l''identifiant.', (select id from public.communes where name_fr = 'Proche A'))
$$, '42501', null, 'impossible d''imposer l''identifiant d''une demande');

-- Pour la suite du test, on fixe un identifiant connu (en tant que superutilisateur).
select pg_temp.logout();
update public.service_requests set id = 'e0000000-0000-4000-8000-000000000001'
where client_id = 'c1111111-1111-4111-8111-111111111111' and title = 'Fuite cuisine';
select pg_temp.login('c1111111-1111-4111-8111-111111111111');

select is((select client_id from public.service_requests where id = 'e0000000-0000-4000-8000-000000000001'),
  'c1111111-1111-4111-8111-111111111111'::uuid, 'le demandeur est l''utilisateur connecté');

insert into public.service_request_private (request_id, address_details)
values ('e0000000-0000-4000-8000-000000000001', '12 rue des Oliviers, 2e étage');

select throws_ok(
  $$ update public.service_requests set status = 'CANCELLED' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'le statut ne se modifie pas directement (fonction serveur)');

select lives_ok(
  $$ update public.service_requests set title = 'Fuite sous l''évier' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'le demandeur modifie sa demande tant qu''elle est ouverte');
select pg_temp.logout();

-- ---------------------------------------------------------------- Visibilité
select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.service_requests where id = 'e0000000-0000-4000-8000-000000000001'), 1,
  'un artisan du bon métier, dans sa zone, voit la demande');
select is((select count(*)::int from public.service_request_private), 0,
  'l''adresse précise reste invisible pour un artisan non retenu');
select pg_temp.logout();

select pg_temp.login('a3333333-3333-4333-8333-333333333333');
select is((select count(*)::int from public.service_requests where id = 'e0000000-0000-4000-8000-000000000001'), 0,
  'un artisan d''un autre métier ne voit pas la demande');
select pg_temp.logout();

select pg_temp.login('a4444444-4444-4444-8444-444444444444');
select is((select count(*)::int from public.service_requests where id = 'e0000000-0000-4000-8000-000000000001'), 0,
  'un artisan hors zone ne voit pas la demande');
select pg_temp.logout();

select pg_temp.login('d5555555-5555-4555-8555-555555555555');
select is((select count(*)::int from public.service_requests where id = 'e0000000-0000-4000-8000-000000000001'), 0,
  'un autre particulier ne voit pas la demande');
select pg_temp.logout();

-- ---------------------------------------------------------------- Propositions
select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select lives_ok($$
  insert into public.proposals (request_id, amount, message, estimated_days)
  values ('e0000000-0000-4000-8000-000000000001', 4500, 'Je remplace le siphon demain matin.', 1)
$$, 'un artisan compatible envoie une proposition');

select pg_temp.logout();
update public.proposals set id = 'f0000000-0000-4000-8000-000000000001'
where artisan_id = 'a2222222-2222-4222-8222-222222222222' and request_id = 'e0000000-0000-4000-8000-000000000001';
select pg_temp.login('a2222222-2222-4222-8222-222222222222');

select throws_ok($$
  insert into public.proposals (request_id, amount, message, estimated_days)
  values ('e0000000-0000-4000-8000-000000000001', 4000, 'Deuxième proposition concurrente.', 1)
$$, '23505', null, 'une seule proposition active par artisan et par demande');

select throws_ok(
  $$ update public.proposals set status = 'ACCEPTED' where id = 'f0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'un artisan ne peut pas accepter sa propre proposition');

select lives_ok(
  $$ update public.proposals set amount = 4200 where id = 'f0000000-0000-4000-8000-000000000001' $$,
  'un artisan modifie sa proposition en attente');
select pg_temp.logout();

select pg_temp.login('a3333333-3333-4333-8333-333333333333');
select throws_ok($$
  insert into public.proposals (request_id, amount, message, estimated_days)
  values ('e0000000-0000-4000-8000-000000000001', 3000, 'Je ne suis pas plombier mais bon.', 1)
$$, '42501', null, 'un artisan non compatible ne peut pas proposer');
select pg_temp.logout();

select pg_temp.login('c1111111-1111-4111-8111-111111111111');
select is((select amount from public.proposals where id = 'f0000000-0000-4000-8000-000000000001'), 4200.00,
  'le demandeur voit les propositions reçues');
update public.proposals set amount = 1 where id = 'f0000000-0000-4000-8000-000000000001';
select is((select amount from public.proposals where id = 'f0000000-0000-4000-8000-000000000001'), 4200.00,
  'le demandeur ne peut pas modifier le montant d''une proposition');
select pg_temp.logout();

select pg_temp.login('d5555555-5555-4555-8555-555555555555');
select is((select count(*)::int from public.proposals where id = 'f0000000-0000-4000-8000-000000000001'), 0,
  'un tiers ne voit pas les propositions');
select throws_ok($$
  insert into public.proposals (request_id, amount, message, estimated_days)
  values ('e0000000-0000-4000-8000-000000000001', 3000, 'Je ne suis même pas artisan.', 1)
$$, '42501', null, 'un utilisateur sans profil artisan ne peut pas proposer');
select pg_temp.logout();

select * from finish();
rollback;
