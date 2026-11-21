-- KHD-008 : profil artisan professionnel (publication, métiers, zones, galerie, confidentialité).
-- Prérequis : migration 20261122090000_artisan_professional_profile appliquée.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

insert into public.categories (id, slug, name_fr, name_ar) values
  ('c0000000-0000-4000-8000-0000000000a1', 'test-a', 'Métier A', 'حرفة أ'),
  ('c0000000-0000-4000-8000-0000000000a2', 'test-b', 'Métier B', 'حرفة ب'),
  ('c0000000-0000-4000-8000-0000000000a3', 'test-c', 'Métier C', 'حرفة ج'),
  ('c0000000-0000-4000-8000-0000000000a4', 'test-d', 'Métier D', 'حرفة د'),
  ('c0000000-0000-4000-8000-0000000000a5', 'test-e', 'Métier E', 'حرفة ه'),
  ('c0000000-0000-4000-8000-0000000000a6', 'test-f', 'Métier F', 'حرفة و'),
  ('c0000000-0000-4000-8000-0000000000a7', 'test-g', 'Métier G', 'حرفة ز');
insert into public.wilayas (id, code, name_fr, name_ar) values (99, '99', 'Test', 'اختبار');
insert into public.communes (wilaya_id, name_fr, name_ar)
  select 99, 'Commune ' || g, 'بلدية ' || g from generate_series(1, 52) g;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'artisan@test.dz', '{"first_name":"Art","last_name":"Isan"}'),
  ('b2222222-2222-4222-8222-222222222222', 'client@test.dz', '{"first_name":"Cli","last_name":"Ent"}');

-- 1. Brouillon par défaut et contrôle serveur de la publication.
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select lives_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id)
  values ('a1111111-1111-4111-8111-111111111111', 'Art Services', 'c0000000-0000-4000-8000-0000000000a1', (select id from public.communes where wilaya_id = 99 and name_fr = 'Commune 1'))
$$, 'activation sans préciser la publication');
select is((select is_published from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), false,
  'un nouveau profil est un brouillon par défaut');
select throws_ok($$ update public.artisan_profiles set is_published = true $$, 'P0001', 'publish_description_required',
  'publication refusée sans description suffisante');
select lives_ok($$ update public.artisan_profiles set description = repeat('Travaux soignés et rapides. ', 3) $$,
  'description ajoutée');
select lives_ok($$ update public.artisan_profiles set is_published = true $$, 'publication acceptée (description + zone)');
select throws_ok($$ update public.artisan_profiles set description = 'Trop court' $$, 'P0001', 'publish_description_required',
  'la description d''un profil publié ne peut pas devenir insuffisante');

-- 2. Zones d'intervention.
select lives_ok($$ insert into public.artisan_service_areas (artisan_id, commune_id) values ('a1111111-1111-4111-8111-111111111111', (select id from public.communes where wilaya_id = 99 and name_fr = 'Commune 2')) $$,
  'ajout d''une zone');
select throws_ok($$ delete from public.artisan_service_areas $$, 'P0001', 'last_zone_published',
  'un profil publié garde au moins une zone');
select is((select count(*)::int from public.artisan_service_areas where artisan_id = 'a1111111-1111-4111-8111-111111111111'), 2,
  'aucune zone supprimée après refus');
select lives_ok($$ delete from public.artisan_service_areas where commune_id = (select id from public.communes where wilaya_id = 99 and name_fr = 'Commune 2') $$, 'retrait d''une zone parmi deux');
select throws_ok($$ insert into public.artisan_service_areas (artisan_id, commune_id)
  select 'a1111111-1111-4111-8111-111111111111', id from public.communes where wilaya_id = 99 and name_fr <> 'Commune 1' $$,
  'P0001', 'zones_limit', 'limite de 50 zones');
select lives_ok($$ update public.artisan_profiles set is_published = false $$, 'dépublication');
select lives_ok($$ delete from public.artisan_service_areas $$, 'un brouillon peut n''avoir aucune zone');
select throws_ok($$ update public.artisan_profiles set is_published = true $$, 'P0001', 'publish_zone_required',
  'publication refusée sans zone');
select lives_ok($$ insert into public.artisan_service_areas (artisan_id, commune_id) values ('a1111111-1111-4111-8111-111111111111', (select id from public.communes where wilaya_id = 99 and name_fr = 'Commune 1')) $$,
  'zone rétablie');

-- 3. Métiers.
select lives_ok($$ update public.artisan_profiles set primary_category_id = 'c0000000-0000-4000-8000-0000000000a2' $$,
  'changement de métier principal');
select ok(exists (select 1 from public.artisan_services where category_id = 'c0000000-0000-4000-8000-0000000000a2'),
  'le nouveau métier principal est ajouté aux services');
select throws_ok($$ delete from public.artisan_services where category_id = 'c0000000-0000-4000-8000-0000000000a2' $$,
  'P0001', 'primary_service_required', 'le métier principal ne peut pas être retiré');
select throws_ok($$ insert into public.artisan_services (artisan_id, category_id)
  select 'a1111111-1111-4111-8111-111111111111', id from public.categories
  where slug in ('test-c', 'test-d', 'test-e', 'test-f', 'test-g') $$,
  'P0001', 'services_limit', 'au maximum un métier principal et 5 secondaires');

-- 4. Galerie : légende facultative, ordre, limites.
select lives_ok($$ insert into public.portfolio_items (artisan_id, sort_order) values ('a1111111-1111-4111-8111-111111111111', 1) $$,
  'réalisation sans légende');
select throws_ok($$ insert into public.portfolio_items (artisan_id, title) values ('a1111111-1111-4111-8111-111111111111', '   ') $$,
  '23514', null, 'une légende vide est refusée');
select lives_ok($$ insert into public.portfolio_items (artisan_id, title, sort_order) values ('a1111111-1111-4111-8111-111111111111', 'Cuisine', 0) $$,
  'réalisation avec légende');
select lives_ok($$ select public.reorder_my_portfolio(array(
  select id from public.portfolio_items order by sort_order desc)) $$, 'réorganisation de sa galerie');
select is((select title from public.portfolio_items order by sort_order limit 1), null,
  'le nouvel ordre est enregistré');
select throws_ok($$ insert into public.portfolio_items (artisan_id, title)
  select 'a1111111-1111-4111-8111-111111111111', 'Photo ' || g from generate_series(1, 19) g $$,
  'P0001', 'portfolio_limit', 'au maximum 20 réalisations');

-- 5. Téléphone professionnel.
select lives_ok($$ update public.artisan_profiles set professional_phone = '+213555123456' $$, 'enregistrement du téléphone');
select is((select public.get_my_professional_phone()), '+213555123456', 'l''artisan relit son propre numéro');
select pg_temp.logout();

-- 6. Un autre utilisateur.
select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select throws_ok($$ select professional_phone from public.artisan_profiles $$, '42501', null,
  'le téléphone professionnel est illisible par les autres utilisateurs');
select lives_ok($$
  update public.artisan_profiles set business_name = 'Piratage' where user_id = 'a1111111-1111-4111-8111-111111111111';
  select public.reorder_my_portfolio(array(select id from public.portfolio_items));
$$, 'tentative de modification du profil et de la galerie d''un autre');
select pg_temp.logout();
select is((select business_name || ' / ' || (select string_agg(coalesce(title, '-'), ',' order by sort_order) from public.portfolio_items where artisan_id = 'a1111111-1111-4111-8111-111111111111')
  from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), 'Art Services / -,Cuisine',
  'le profil et l''ordre de la galerie de l''artisan sont inchangés');

select * from finish();
rollback;
