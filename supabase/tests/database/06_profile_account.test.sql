-- KHD-005 : profil (commune, téléphone, langue) et suppression de compte.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
insert into public.communes (wilaya_id, name_fr, name_ar) values (99, 'Commune A', 'أ'), (99, 'Commune B', 'ب');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'profil@test.dz', '{"first_name":"Nadia","last_name":"Test","phone":"+213555111222"}'),
  ('b2222222-2222-4222-8222-222222222222', 'autre@test.dz', '{"first_name":"Omar","last_name":"Test","phone":"+213661333444"}'),
  ('c3333333-3333-4333-8333-333333333333', 'artisan@test.dz', '{"first_name":"Art","last_name":"Isan"}');

-- ------------------------------------------------------------------ Commune du profil
select pg_temp.login('a1111111-1111-4111-8111-111111111111');

select lives_ok($$
  update public.profile_private set commune_id = (select id from public.communes where name_fr = 'Commune A')
$$, 'un utilisateur choisit sa commune');
select is((select c.name_fr from public.profile_private p join public.communes c on c.id = p.commune_id), 'Commune A',
  'la commune est enregistrée');

select throws_ok($$ update public.profile_private set commune_id = 999999999 $$, '23503', null,
  'une commune inexistante est refusée');

update public.profile_private set commune_id = (select id from public.communes where name_fr = 'Commune B')
where user_id = 'b2222222-2222-4222-8222-222222222222';
select pg_temp.logout();
select is((select commune_id from public.profile_private where user_id = 'b2222222-2222-4222-8222-222222222222'), null,
  'impossible de modifier la commune d''un autre utilisateur');

select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.profile_private where user_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'la commune d''un utilisateur reste privée');
select pg_temp.logout();

-- ------------------------------------------------------------------ Téléphone et langue
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select throws_ok($$ update public.profile_private set phone = '+213661333444' $$, '23505', null,
  'un numéro déjà utilisé par un autre compte est refusé');
select throws_ok($$ update public.profile_private set phone = '0555111222' $$, '23514', null,
  'le téléphone doit être au format +213 normalisé');
select lives_ok($$ update public.profile_private set locale = 'ar' $$, 'la langue préférée est modifiable');
select throws_ok($$ update public.profile_private set terms_accepted_at = now() $$, '42501', null,
  'la date d''acceptation des conditions n''est pas modifiable');
select pg_temp.logout();

-- ------------------------------------------------------------------ Suppression de compte
set local role anon;
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'un visiteur ne peut pas appeler la suppression');
reset role;

-- Prestation en cours entre a1111111 (client) et l'artisan c3333333.
insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, description, is_published) values
  ('c3333333-3333-4333-8333-333333333333', 'Artisan', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true);
insert into public.jobs (id, client_id, artisan_id, agreed_amount, status) values
  ('d0000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111',
    'c3333333-3333-4333-8333-333333333333', 5000, 'IN_PROGRESS');

select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select throws_ok($$ select public.delete_my_account() $$, 'P0001', 'active_jobs',
  'suppression refusée tant qu''une prestation est en cours');
select pg_temp.logout();

update public.jobs set status = 'COMPLETED', completed_at = now() where id = 'd0000000-0000-4000-8000-000000000001';

select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select lives_ok($$ select public.delete_my_account() $$, 'suppression possible une fois la prestation terminée');
select pg_temp.logout();

select is((select count(*)::int from auth.users where id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'le compte d''authentification est supprimé');
select is((select count(*)::int from public.profile_private where user_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'les données privées sont supprimées');
select is((select client_id from public.jobs where id = 'd0000000-0000-4000-8000-000000000001'), null,
  'l''historique de prestation est conservé mais anonymisé');
select is((select count(*)::int from auth.users where id = 'b2222222-2222-4222-8222-222222222222'), 1,
  'les autres comptes ne sont pas affectés');

select * from finish();
rollback;
