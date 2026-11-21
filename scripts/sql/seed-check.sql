-- Vérification du seed de démonstration (projet de TEST) — LECTURE SEULE.
-- Seuls les comptes de démonstration (@khedma.test) sont comptés : vos comptes de test réels sont ignorés.
set session characteristics as transaction read only;
\pset footer off

with expected(ordre, element, attendu, obtenu) as (values
  (1, 'Catégories', 12, (select count(*) from public.categories)),
  (2, 'Wilayas (référentiel officiel)', 69, (select count(*) from public.wilayas)),
  (3, 'Communes avec code officiel ONS', 1541, (select count(distinct official_code) from public.communes)),
  (3.5, 'Communes (avec coordonnées de démonstration)', 9, (select count(*) from public.communes where centroid is not null)),
  (4, 'Comptes auth.users (@khedma.test)', 5, (select count(*) from auth.users where email like '%@khedma.test')),
  (5, 'Identités e-mail (connexion possible)', 5, (select count(*) from auth.identities i join auth.users u on u.id = i.user_id where u.email like '%@khedma.test' and i.provider = 'email')),
  (6, 'E-mails confirmés', 5, (select count(*) from auth.users where email like '%@khedma.test' and email_confirmed_at is not null)),
  (7, 'Profils', 5, (select count(*) from public.profiles where id in (select id from auth.users where email like '%@khedma.test'))),
  (8, 'Données privées (profile_private)', 5, (select count(*) from public.profile_private where user_id in (select id from auth.users where email like '%@khedma.test'))),
  (9, 'Préférences de notification', 5, (select count(*) from public.notification_preferences where user_id in (select id from auth.users where email like '%@khedma.test'))),
  (10, 'Rôles PARTICULIER', 5, (select count(*) from public.user_roles where role = 'PARTICULIER' and user_id in (select id from auth.users where email like '%@khedma.test'))),
  (11, 'Rôles ARTISAN', 3, (select count(*) from public.user_roles where role = 'ARTISAN' and user_id in (select id from auth.users where email like '%@khedma.test'))),
  (12, 'Administrateurs', 1, (select count(*) from private.admins)),
  (13, 'Profils artisans', 3, (select count(*) from public.artisan_profiles where user_id in (select id from auth.users where email like '%@khedma.test'))),
  (14, 'Services artisans', 4, (select count(*) from public.artisan_services where artisan_id in (select id from auth.users where email like '%@khedma.test'))),
  (15, 'Zones d''intervention', 5, (select count(*) from public.artisan_service_areas where artisan_id in (select id from auth.users where email like '%@khedma.test'))),
  (16, 'Demandes', 4, (select count(*) from public.service_requests)),
  (17, 'Demandes ouvertes', 3, (select count(*) from public.service_requests where status = 'OPEN')),
  (18, 'Propositions', 4, (select count(*) from public.proposals)),
  (19, 'Prestations terminées', 1, (select count(*) from public.jobs where status = 'COMPLETED')),
  (20, 'Avis publiés', 1, (select count(*) from public.reviews where status = 'PUBLISHED')),
  (21, 'Karim : nombre d''avis réel', 1, (select review_count from public.artisan_profiles where user_id = '22222222-2222-4222-8222-222222222222')),
  (22, 'Karim : note moyenne × 100', 500, (select (rating_avg * 100)::int from public.artisan_profiles where user_id = '22222222-2222-4222-8222-222222222222')),
  (23, 'Téléphones valides enregistrés', 4, (select count(*) from public.profile_private where phone is not null and user_id in (select id from auth.users where email like '%@khedma.test')))
)
select element as "Élément", attendu as "Attendu", obtenu as "Obtenu",
  case when obtenu = attendu then 'OK' else 'FAIL' end as "Statut"
from expected order by ordre;
