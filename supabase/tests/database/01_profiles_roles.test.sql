-- Profils, données privées, rôles et administration.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Utilitaires : se connecter « en tant que » un utilisateur (JWT simulé) ou repasser superutilisateur.
create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'alice@test.dz',
    '{"first_name":"Alice","last_name":"A","phone":"+213555123456","locale":"ar","terms_accepted":"true"}'),
  ('b2222222-2222-4222-8222-222222222222', 'bob@test.dz',
    '{"first_name":"Bob","last_name":"B","phone":"0555 12 34 56 injection"}');

-- Inscription : profil, données privées, rôle et préférences créés automatiquement.
select is((select first_name from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'), 'Alice',
  'le profil est créé à l''inscription');
select is((select locale::text from public.profile_private where user_id = 'a1111111-1111-4111-8111-111111111111'), 'ar',
  'la langue choisie est enregistrée');
select is((select role::text from public.user_roles where user_id = 'a1111111-1111-4111-8111-111111111111'), 'PARTICULIER',
  'le rôle PARTICULIER est attribué par défaut');
select ok(exists(select 1 from public.notification_preferences where user_id = 'a1111111-1111-4111-8111-111111111111'),
  'les préférences de notification sont créées');
select is((select phone from public.profile_private where user_id = 'b2222222-2222-4222-8222-222222222222'), null,
  'un téléphone invalide envoyé à l''inscription est ignoré');

select pg_temp.login('a1111111-1111-4111-8111-111111111111');

select is((select count(*)::int from public.profile_private), 1,
  'un utilisateur ne voit que ses propres données privées');
select is((select count(*)::int from public.profiles where id in ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')), 2,
  'un utilisateur connecté voit les profils publics actifs');

update public.profiles set first_name = 'Alicia' where id = 'a1111111-1111-4111-8111-111111111111';
select is((select first_name from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'), 'Alicia',
  'un utilisateur peut modifier son nom');

select throws_ok(
  $$ update public.profiles set status = 'SUSPENDED' where id = 'b2222222-2222-4222-8222-222222222222' $$,
  '42501', null, 'impossible de modifier un statut de compte');

-- La RLS filtre silencieusement la ligne (0 ligne modifiée) : on vérifie que la valeur est intacte.
update public.profiles set first_name = 'Pirate' where id = 'b2222222-2222-4222-8222-222222222222';
select is((select first_name from public.profiles where id = 'b2222222-2222-4222-8222-222222222222'), 'Bob',
  'impossible de modifier le profil d''un autre utilisateur');

select throws_ok(
  $$ update public.profile_private set phone_verified_at = now() $$,
  '42501', null, 'impossible de se déclarer « téléphone vérifié »');

select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('a1111111-1111-4111-8111-111111111111', 'ARTISAN') $$,
  '42501', null, 'impossible de s''attribuer un rôle directement');

select throws_ok(
  $$ select private.grant_admin('a1111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'impossible de s''attribuer le rôle administrateur');

select throws_ok($$ select * from private.admins $$, '42501', null, 'la table des administrateurs est inaccessible');

select is((select private.is_admin()), false, 'un utilisateur ordinaire n''est pas administrateur');

select pg_temp.logout();

-- Changer de téléphone annule la vérification.
update public.profile_private set phone_verified_at = now() where user_id = 'a1111111-1111-4111-8111-111111111111';
select pg_temp.login('a1111111-1111-4111-8111-111111111111');
update public.profile_private set phone = '+213661000000';
select is((select phone_verified_at from public.profile_private), null,
  'changer de numéro annule la vérification du téléphone');
select pg_temp.logout();

set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'un visiteur anonyme ne lit pas les profils');
reset role;

select * from finish();
rollback;
