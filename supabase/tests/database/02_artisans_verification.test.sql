-- Profils artisans, champs protégés, vérification.
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
insert into public.communes (wilaya_id, name_fr, name_ar) values (99, 'Commune A', 'بلدية أ');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'artisan@test.dz', '{"first_name":"Art","last_name":"Isan"}'),
  ('b2222222-2222-4222-8222-222222222222', 'client@test.dz', '{"first_name":"Cli","last_name":"Ent"}');

select pg_temp.login('a1111111-1111-4111-8111-111111111111');

select lives_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, description, is_published)
  values ('a1111111-1111-4111-8111-111111111111', 'Art Plomberie', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true)
$$, 'un utilisateur peut créer son profil artisan (publié, description complète)');

select ok((select private.has_role('ARTISAN')), 'le rôle ARTISAN est attribué automatiquement');
select is((select count(*)::int from public.artisan_services where artisan_id = 'a1111111-1111-4111-8111-111111111111'), 1, 'le métier principal est ajouté aux services');

select throws_ok(
  $$ update public.artisan_profiles set verification_status = 'VERIFIED' $$,
  '42501', null, 'impossible de se déclarer vérifié');
select throws_ok(
  $$ update public.artisan_profiles set rating_avg = 5, review_count = 100 $$,
  '42501', null, 'impossible de modifier sa note ou son nombre d''avis');

select throws_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id)
  values ('b2222222-2222-4222-8222-222222222222', 'Usurpation', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'))
$$, '42501', null, 'impossible de créer un profil artisan pour un autre utilisateur');

select throws_ok($$
  insert into public.verification_requests (document_paths) values (array['b2222222-2222-4222-8222-222222222222/cni.pdf'])
$$, '42501', null, 'les justificatifs doivent être dans le dossier privé de l''artisan');

select lives_ok($$
  insert into public.verification_requests (document_paths) values (array['a1111111-1111-4111-8111-111111111111/cni.pdf'])
$$, 'un artisan peut soumettre ses justificatifs');

select is((select verification_status::text from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), 'PENDING',
  'la soumission passe le profil en « en cours », jamais en « vérifié »');

select throws_ok($$
  insert into public.verification_requests (document_paths) values (array['a1111111-1111-4111-8111-111111111111/autre.pdf'])
$$, '23505', null, 'une seule demande de vérification en cours à la fois');

select pg_temp.logout();
select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), 1, 'un client voit les artisans publiés');
select is((select count(*)::int from public.verification_requests where artisan_id = 'a1111111-1111-4111-8111-111111111111'), 0, 'un client ne voit pas les justificatifs d''un artisan');
select pg_temp.logout();

select * from finish();
rollback;
