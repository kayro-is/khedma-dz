-- KHD-008-SEC : confidentialité des photos de réalisations (bucket « portfolio » privé).
-- La délivrance d'une URL signée par Supabase Storage exige le droit SELECT sur l'objet :
-- ces tests vérifient donc qui peut obtenir un accès, selon le statut de publication.
-- Prérequis : migration 20261123090000_portfolio_private_bucket appliquée.
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
create function pg_temp.visible() returns int language sql as $$
  select count(*)::int from storage.objects
  where bucket_id = 'portfolio' and name = 'a1111111-1111-4111-8111-111111111111/e1111111-1111-4111-8111-111111111111/1.jpg';
$$;

insert into public.categories (id, slug, name_fr, name_ar) values
  ('c0000000-0000-4000-8000-0000000000aa', 'test-sec', 'Métier', 'حرفة');
insert into public.wilayas (id, code, name_fr, name_ar) values (99, '99', 'Test', 'اختبار');
insert into public.communes (wilaya_id, name_fr, name_ar) values (99, 'Commune A', 'بلدية أ');
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'artisan.brouillon@test.dz', '{"first_name":"Art","last_name":"Brouillon"}'),
  ('b2222222-2222-4222-8222-222222222222', 'autre.artisan@test.dz', '{"first_name":"Autre","last_name":"Artisan"}'),
  ('c3333333-3333-4333-8333-333333333333', 'client@test.dz', '{"first_name":"Cli","last_name":"Ent"}');
insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, description, is_published) values
  ('a1111111-1111-4111-8111-111111111111', 'Atelier brouillon', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), null, false),
  ('b2222222-2222-4222-8222-222222222222', 'Autre atelier', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'),
    'Artisan de démonstration pour les tests automatisés, avec une description complète.', true);
insert into public.portfolio_items (id, artisan_id, title) values
  ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Cuisine');
insert into public.portfolio_images (item_id, storage_path) values
  ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111/e1111111-1111-4111-8111-111111111111/1.jpg');

select is((select public from storage.buckets where id = 'portfolio'), false, 'le bucket portfolio est privé');
select is((select public from storage.buckets where id = 'avatars'), true, 'le bucket avatars est inchangé');

-- 1. Dépôt par le propriétaire (profil en brouillon).
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('portfolio',
  'a1111111-1111-4111-8111-111111111111/e1111111-1111-4111-8111-111111111111/1.jpg', 'a1111111-1111-4111-8111-111111111111') $$,
  'l''artisan dépose une photo dans son dossier, même en brouillon');
select is(pg_temp.visible(), 1, 'le propriétaire accède à sa photo en brouillon');
select pg_temp.logout();

-- 2. Profil en brouillon : aucun accès pour les autres.
select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select is(pg_temp.visible(), 0, 'un autre artisan n''accède pas à la photo d''un brouillon');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('portfolio',
  'a1111111-1111-4111-8111-111111111111/intrusion/2.jpg', 'b2222222-2222-4222-8222-222222222222') $$,
  '42501', null, 'un autre artisan ne peut pas déposer dans ce dossier');
select pg_temp.logout();
select pg_temp.login('c3333333-3333-4333-8333-333333333333');
select is(pg_temp.visible(), 0, 'un client n''accède pas à la photo d''un brouillon');
select pg_temp.logout();
set local role anon;
select is(pg_temp.visible(), 0, 'un visiteur non connecté n''accède à aucune photo');
reset role;

-- 3. Publication : accès pour les utilisateurs connectés.
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
update public.artisan_profiles set description = repeat('Travaux soignés et rapides. ', 3), is_published = true
  where user_id = 'a1111111-1111-4111-8111-111111111111';
select pg_temp.logout();
select pg_temp.login('c3333333-3333-4333-8333-333333333333');
select is(pg_temp.visible(), 1, 'un client accède aux photos d''un profil publié');
-- Selon la version de Storage, la suppression SQL directe est filtrée (0 ligne) ou refusée : dans
-- les deux cas, le fichier doit toujours exister.
do $$ begin
  delete from storage.objects where bucket_id = 'portfolio';
exception when others then null;
end $$;
select is(pg_temp.visible(), 1, 'un client ne peut pas supprimer la photo');
select pg_temp.logout();
select pg_temp.login('b2222222-2222-4222-8222-222222222222');
select is(pg_temp.visible(), 1, 'un autre artisan accède aux photos d''un profil publié');
with u as (update storage.objects set name = name || '.x' where bucket_id = 'portfolio' returning 1)
select is((select count(*)::int from u), 0, 'un autre artisan ne peut pas modifier la photo');
select pg_temp.logout();

-- 4. Dépublication : plus aucun nouvel accès ; rien n'est supprimé.
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
update public.artisan_profiles set is_published = false where user_id = 'a1111111-1111-4111-8111-111111111111';
select is(pg_temp.visible(), 1, 'après dépublication, le propriétaire accède toujours à sa photo');
select pg_temp.logout();
select pg_temp.login('c3333333-3333-4333-8333-333333333333');
select is(pg_temp.visible(), 0, 'après dépublication, un client ne peut plus obtenir d''accès');
select pg_temp.logout();
select is((select count(*)::int from storage.objects where bucket_id = 'portfolio'
  and name like 'a1111111-1111-4111-8111-111111111111/%'), 1, 'la dépublication ne supprime aucun fichier');
select is((select count(*)::int from public.portfolio_images where item_id = 'e1111111-1111-4111-8111-111111111111'), 1,
  'la dépublication ne supprime aucune réalisation');

select * from finish();
rollback;
