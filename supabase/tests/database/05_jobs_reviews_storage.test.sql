-- Prestations, avis (éligibilité, unicité, agrégats) et stockage privé.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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
  ('d3333333-3333-4333-8333-333333333333', 'tiers@test.dz', '{"first_name":"T","last_name":"T"}');
insert into public.artisan_profiles (user_id, business_name, primary_category_id, base_commune_id, description, is_published) values
  ('a2222222-2222-4222-8222-222222222222', 'Artisan', 'c0000000-0000-4000-8000-0000000000aa',
    (select id from public.communes where name_fr = 'Commune A'), 'Artisan de démonstration pour les tests automatisés, avec une description complète.', true);

-- Prestation créée côté serveur (en production : acceptation atomique, KHD-012).
insert into public.service_requests (id, client_id, category_id, title, description, commune_id, status) values
  ('e0000000-0000-4000-8000-000000000001', 'c1111111-1111-4111-8111-111111111111', 'c0000000-0000-4000-8000-0000000000aa',
    'Chauffe-eau', 'Remplacement du chauffe-eau de la salle de bain.',
    (select id from public.communes where name_fr = 'Commune A'), 'IN_PROGRESS');
insert into public.jobs (id, request_id, client_id, artisan_id, agreed_amount, status) values
  ('a0b00000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
    'c1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 12000, 'IN_PROGRESS');

select pg_temp.login('c1111111-1111-4111-8111-111111111111');
select throws_ok($$
  insert into public.jobs (client_id, artisan_id, agreed_amount)
  values ('c1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 1)
$$, '42501', null, 'impossible de créer une prestation directement');
select throws_ok(
  $$ update public.jobs set status = 'COMPLETED' $$,
  '42501', null, 'impossible de clôturer une prestation directement');
select throws_ok($$
  insert into public.reviews (job_id, rating, comment) values ('a0b00000-0000-4000-8000-000000000001', 5, 'Trop tôt')
$$, '42501', null, 'pas d''avis avant la fin de la prestation');
select pg_temp.logout();

update public.jobs set status = 'COMPLETED', completed_at = now() where id = 'a0b00000-0000-4000-8000-000000000001';

select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select throws_ok($$
  insert into public.reviews (job_id, rating) values ('a0b00000-0000-4000-8000-000000000001', 5)
$$, '42501', null, 'un artisan ne peut pas s''auto-évaluer');
select pg_temp.logout();

select pg_temp.login('d3333333-3333-4333-8333-333333333333');
select throws_ok($$
  insert into public.reviews (job_id, rating) values ('a0b00000-0000-4000-8000-000000000001', 1)
$$, '42501', null, 'un tiers ne peut pas évaluer une prestation qui ne le concerne pas');
select pg_temp.logout();

select pg_temp.login('c1111111-1111-4111-8111-111111111111');
select lives_ok($$
  insert into public.reviews (job_id, rating, comment) values ('a0b00000-0000-4000-8000-000000000001', 4, 'Bon travail.')
$$, 'le client évalue une prestation terminée');
select throws_ok($$
  insert into public.reviews (job_id, rating) values ('a0b00000-0000-4000-8000-000000000001', 5)
$$, '23505', null, 'un seul avis par prestation');
select pg_temp.logout();

select results_eq(
  $$ select rating_avg, review_count from public.artisan_profiles where user_id = 'a2222222-2222-4222-8222-222222222222' $$,
  $$ values (4.00::numeric(3,2), 1) $$,
  'la note et le nombre d''avis réels sont recalculés');

select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select lives_ok($$
  update public.reviews set artisan_reply = 'Merci !' where job_id = 'a0b00000-0000-4000-8000-000000000001'
$$, 'l''artisan répond à un avis');
select throws_ok($$
  update public.reviews set rating = 5 where job_id = 'a0b00000-0000-4000-8000-000000000001'
$$, '42501', null, 'l''artisan ne peut pas modifier la note');
select pg_temp.logout();

-- ---------------------------------------------------------------- Stockage
select pg_temp.login('a2222222-2222-4222-8222-222222222222');
select lives_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('verification-documents', 'a2222222-2222-4222-8222-222222222222/cni.pdf', 'a2222222-2222-4222-8222-222222222222')
$$, 'un artisan dépose un justificatif dans son dossier privé');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('verification-documents', 'c1111111-1111-4111-8111-111111111111/faux.pdf', 'a2222222-2222-4222-8222-222222222222')
$$, '42501', null, 'impossible de déposer dans le dossier d''un autre');
select pg_temp.logout();

select pg_temp.login('d3333333-3333-4333-8333-333333333333');
select is((select count(*)::int from storage.objects where bucket_id = 'verification-documents'), 0,
  'les justificatifs ne sont pas lisibles par les autres utilisateurs');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('request-images', 'd3333333-3333-4333-8333-333333333333/e0000000-0000-4000-8000-000000000001/x.jpg',
    'd3333333-3333-4333-8333-333333333333')
$$, '42501', null, 'impossible d''ajouter une photo à la demande d''un autre');
select pg_temp.logout();

select * from finish();
rollback;
