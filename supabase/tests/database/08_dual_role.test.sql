-- KHD-006 : double rôle Particulier / Artisan sur un seul compte.
-- Le mode affiché par l'application n'a aucune valeur de sécurité : seules comptent les
-- autorisations serveur (user_roles, attribué par trigger ; RLS ; droits par colonne).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
  ('a1111111-1111-4111-8111-111111111111', 'futur.artisan@test.dz', '{"first_name":"Futur","last_name":"Artisan"}'),
  ('b2222222-2222-4222-8222-222222222222', 'client@test.dz', '{"first_name":"Cli","last_name":"Ent"}'),
  ('c3333333-3333-4333-8333-333333333333', 'suspendu@test.dz', '{"first_name":"Sus","last_name":"Pendu"}');

-- 1. Mode Particulier par défaut : tout compte naît Particulier, sans rôle Artisan.
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select is((select array_agg(role::text order by role) from public.user_roles), array['PARTICULIER'],
  'un nouveau compte a uniquement le rôle PARTICULIER');

-- 2. Aucune écriture directe des rôles : changer de mode ne peut pas s'octroyer ARTISAN.
select throws_ok($$ insert into public.user_roles (user_id, role) values ('a1111111-1111-4111-8111-111111111111', 'ARTISAN') $$,
  '42501', null, 'impossible de s''attribuer le rôle ARTISAN directement');
select throws_ok($$ update public.user_roles set role = 'ARTISAN' $$,
  '42501', null, 'impossible de transformer son rôle PARTICULIER en ARTISAN');
select throws_ok($$ delete from public.user_roles $$,
  '42501', null, 'impossible de supprimer ses rôles');

-- 3. Sans rôle ARTISAN confirmé par le serveur, aucune action réservée aux artisans.
select throws_ok($$ insert into public.portfolio_items (artisan_id, title) values ('a1111111-1111-4111-8111-111111111111', 'Salle de bain') $$,
  '42501', null, 'sans rôle ARTISAN : ajout de réalisation refusé');

-- 4. Activation de l'espace Artisan telle que faite par l'application (profil NON publié).
select throws_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, verification_status)
  values ('a1111111-1111-4111-8111-111111111111', 'Futur Plomberie', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 'VERIFIED')
$$, '42501', null, 'impossible de s''activer en se déclarant vérifié');
select lives_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, years_experience, is_published)
  values ('a1111111-1111-4111-8111-111111111111', 'Futur Plomberie', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 12, false)
$$, 'activation de l''espace Artisan sur le compte existant');
select is((select array_agg(role::text order by role) from public.user_roles), array['PARTICULIER', 'ARTISAN'],
  'les deux rôles coexistent : ARTISAN attribué par le serveur, PARTICULIER conservé');
select is((select count(*)::int from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'), 1,
  'une seule identité : aucun second profil créé');
select is((select verification_status::text || '/' || is_published from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), 'UNVERIFIED/false',
  'profil créé non vérifié et non publié');
select lives_ok($$ insert into public.portfolio_items (artisan_id, title) values ('a1111111-1111-4111-8111-111111111111', 'Salle de bain') $$,
  'avec le rôle ARTISAN : ajout de réalisation autorisé');
select throws_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id)
  values ('a1111111-1111-4111-8111-111111111111', 'Doublon', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'))
$$, '23505', null, 'une seconde activation ne crée pas de second profil artisan');
select pg_temp.logout();

-- 5. Profil non publié : invisible des autres utilisateurs ; rôles d'autrui illisibles.
select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.artisan_profiles where user_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'un profil artisan non publié est invisible des clients');
select is((select count(*)::int from public.portfolio_items where artisan_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'les réalisations d''un artisan non publié sont invisibles');
select is((select count(*)::int from public.user_roles where user_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'les rôles d''un autre utilisateur sont illisibles');
select throws_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id)
  values ('a1111111-1111-4111-8111-111111111111', 'Usurpation', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'))
$$, '42501', null, 'impossible d''activer l''espace Artisan d''un autre compte');
select pg_temp.logout();

-- 6. Compte suspendu : activation refusée.
update public.profiles set status = 'SUSPENDED' where id = 'c3333333-3333-4333-8333-333333333333';
select pg_temp.login('c3333333-3333-4333-8333-333333333333');
select throws_ok($$
  insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id)
  values ('c3333333-3333-4333-8333-333333333333', 'Suspendu Services', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'))
$$, '42501', null, 'un compte suspendu ne peut pas activer l''espace Artisan');
select pg_temp.logout();

select * from finish();
rollback;
