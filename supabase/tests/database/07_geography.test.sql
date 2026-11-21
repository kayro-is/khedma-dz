-- KHD-007 : référentiel géographique officiel (69 wilayas, 1 541 communes) et recherche bilingue.
-- Prérequis : migration 20261121120000_geo_reference_2026 appliquée.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Effectifs et codes (loi n° 26-06, art. 3 ; ONS 2021).
select is((select count(*)::int from public.wilayas where id between 1 and 69), 69, '69 wilayas numérotées de 1 à 69');
select is((select count(*)::int from public.wilayas where code <> lpad(id::text, 2, '0')), 0, 'code de wilaya = numéro sur 2 chiffres');
select is((select count(*)::int from public.communes), 1541, '1 541 communes');
select is((select count(distinct official_code)::int from public.communes where official_code ~ '^[0-9]{4}$'), 1541,
  'chaque commune a un code officiel ONS unique à 4 chiffres');
select is((select count(*)::int from public.wilayas w where not exists (select 1 from public.communes c where c.wilaya_id = w.id)), 0,
  'aucune wilaya sans commune');

-- Noms bilingues.
select is((select count(*)::int from public.communes where name_ar !~ '[ء-ي]' or name_ar ~ '[A-Za-z]' or btrim(name_fr) = ''), 0,
  'noms français présents et noms arabes en écriture arabe');
select is((select count(*)::int from public.wilayas where name_ar !~ '[ء-ي]' or name_ar ~ '[A-Za-z]'), 0,
  'noms arabes des wilayas en écriture arabe');
select is((select count(*)::int from (select wilaya_id, private.normalize_search(name_fr) from public.communes group by 1, 2 having count(*) > 1) d), 0,
  'aucun doublon de nom dans une même wilaya (même après normalisation)');

-- Wilayas créées par la loi n° 26-06, numérotées par le décret n° 26-206.
select is(
  (select string_agg(id || ':' || name_fr, ', ' order by id) from public.wilayas where id >= 59),
  '59:Aflou, 60:Barika, 61:El Kantara, 62:Bir El Ater, 63:El Aricha, 64:Ksar Chellala, 65:Aïn Ouessara, 66:Messaad, 67:Ksar El Boukhari, 68:Bou Saâda, 69:El Abiodh Sidi Cheikh',
  'numéros et noms des wilayas 59 à 69 (décret 26-206)');
select is((select name_ar from public.wilayas where id = 59), 'أفلو', 'graphie arabe de la wilaya 59 conforme au décret');
select is(
  (select string_agg(wilaya_id || ':' || n, ',' order by wilaya_id) from (select wilaya_id, count(*) n from public.communes where wilaya_id >= 59 group by wilaya_id) t),
  '59:12,60:8,61:5,62:4,63:4,64:6,65:10,66:8,67:21,68:23,69:7',
  'nombre de communes des wilayas 59 à 69 (loi 26-06, art. 52 bis 10 à 20)');
select is(
  (select string_agg(wilaya_id || ':' || n, ',' order by wilaya_id) from (select wilaya_id, count(*) n from public.communes where wilaya_id in (3, 5, 7, 12, 13, 14, 17, 26, 28, 32) group by wilaya_id) t),
  '3:12,5:53,7:22,12:24,13:49,14:36,17:18,26:43,28:24,32:15',
  'nombre de communes des wilayas mères redécoupées (loi 26-06)');
select is((select w.name_fr from public.communes c join public.wilayas w on w.id = c.wilaya_id where c.official_code = '0319'), 'Aflou',
  'Aflou (code ONS 0319) rattachée à la wilaya 59 sans changer de code');
select is((select count(*)::int from public.communes c join public.wilayas w on w.id = c.wilaya_id
  where left(c.official_code, 2)::int <> w.id and w.id < 59), 0,
  'hors wilayas 59 à 69, le préfixe du code ONS est le numéro de la wilaya');

-- Données de démonstration et relations conservées (projet de TEST).
select is((select count(*)::int from public.communes where centroid is not null), 9,
  'seules les 9 communes de démonstration ont des coordonnées (aucune inventée)');
select is((select official_code from public.communes c join public.service_requests r on r.commune_id = c.id
  where r.id = 'a0000000-0000-4000-8000-000000000001'), '1628', 'la demande de démonstration pointe toujours sur Hydra');
-- Zones : Karim (base Hydra + Alger Centre, Kouba), Haddad (base Bir El Djir), 3e artisan (base Kouba).
select is((select string_agg(c.official_code, ',' order by c.official_code) from public.artisan_service_areas z
  join public.communes c on c.id = z.commune_id
  where z.artisan_id in (select id from auth.users where email like '%@khedma.test')), '1601,1618,1618,1628,3103',
  'les 5 zones d''intervention de démonstration pointent toujours sur les mêmes communes');

-- Recherche bilingue : même normalisation que l'application (supabase/tests/fixtures/search-normalization.json).
select is(private.normalize_search('Alger-Centre'), 'alger centre', 'tirets neutralisés');
select is(private.normalize_search('M''Sila'), 'msila', 'apostrophes retirées');
select is(private.normalize_search('Aïn Ouessara'), 'ain ouessara', 'accents retirés');
select is(private.normalize_search('الأغواط'), 'الاغواط', 'variantes de alef unifiées');
select is((select official_code from public.communes where private.normalize_search(name_fr) = private.normalize_search('ksar el-boukhari')),
  '2635', 'une recherche tolérante trouve Ksar El Boukhari');

-- Lecture publique, écriture interdite.
set local role anon;
select is((select count(*)::int from public.communes), 1541, 'les visiteurs lisent toutes les communes');
reset role;
set local role authenticated;
select throws_ok($$ update public.communes set name_fr = 'X' where official_code = '1628' $$, '42501', null,
  'un utilisateur ne peut pas modifier le référentiel');
reset role;

select * from finish();
rollback;
