-- =============================================================================
-- Données de démonstration — ENVIRONNEMENT LOCAL UNIQUEMENT
-- Exécuté par `supabase db reset`. Ne jamais appliquer en production.
-- Personnes FICTIVES. Mot de passe de tous les comptes : Khedma2026!
--
-- Géographie : le référentiel officiel (69 wilayas, 1 541 communes) est chargé par la migration
-- KHD-007. Le seed ajoute seulement des coordonnées APPROXIMATIVES (centre-ville, au centième
-- de degré) à 9 communes de démonstration, pour tester les distances. Aucune autre coordonnée.
-- =============================================================================

-- Catégories (synonymes de recherche fr / ar / darija, à enrichir avec des utilisateurs pilotes)
insert into public.categories (slug, name_fr, name_ar, search_terms, sort_order) values
  ('plomberie', 'Plomberie', 'سباكة', array['plombier', 'plombi', 'fuite', 'tuyauterie', 'سباك', 'بلومبي'], 1),
  ('electricite', 'Électricité', 'كهرباء', array['électricien', 'electricien', 'courant', 'كهربائي', 'تريسيان'], 2),
  ('climatisation', 'Climatisation', 'تكييف', array['clim', 'climatiseur', 'مكيف', 'كليماتيزور'], 3),
  ('peinture', 'Peinture', 'دهان', array['peintre', 'صباغ', 'بنتر'], 4),
  ('menuiserie', 'Menuiserie', 'نجارة', array['menuisier', 'bois', 'porte', 'نجار'], 5),
  ('maconnerie', 'Maçonnerie', 'بناء', array['maçon', 'macon', 'carrelage', 'بنّاء', 'ماصو'], 6),
  ('jardinage', 'Jardinage', 'بستنة', array['jardinier', 'jardin', 'بستاني', 'جنان'], 7),
  ('nettoyage', 'Nettoyage', 'تنظيف', array['ménage', 'menage', 'nettoyage', 'نظافة'], 8),
  ('mecanique', 'Mécanique', 'ميكانيك', array['mécanicien', 'garage', 'voiture', 'ميكانيكي'], 9),
  ('serrurerie', 'Serrurerie', 'أقفال', array['serrurier', 'clé', 'cle', 'serrure', 'قفال'], 10),
  ('electromenager', 'Électroménager', 'أجهزة كهرومنزلية', array['frigo', 'machine à laver', 'four', 'ثلاجة', 'غسالة'], 11),
  ('renovation', 'Rénovation', 'ترميم', array['travaux', 'rénovation', 'renovation', 'ترميم'], 12);

update public.wilayas w set centroid = v.centroid::extensions.geography
from (values
  (16, 'SRID=4326;POINT(3.06 36.75)'),
  (25, 'SRID=4326;POINT(6.61 36.37)'),
  (31, 'SRID=4326;POINT(-0.63 35.70)')
) v(id, centroid)
where w.id = v.id;

-- Communes de démonstration, identifiées par leur code officiel ONS.
update public.communes c set centroid = v.centroid::extensions.geography
from (values
  ('1601', 'SRID=4326;POINT(3.06 36.77)'),  -- Alger Centre
  ('1605', 'SRID=4326;POINT(3.05 36.79)'),  -- Bab El Oued
  ('1628', 'SRID=4326;POINT(3.03 36.74)'),  -- Hydra
  ('1618', 'SRID=4326;POINT(3.08 36.72)'),  -- Kouba
  ('2501', 'SRID=4326;POINT(6.61 36.37)'),  -- Constantine
  ('2506', 'SRID=4326;POINT(6.69 36.26)'),  -- El Khroub
  ('3101', 'SRID=4326;POINT(-0.63 35.70)'), -- Oran
  ('3103', 'SRID=4326;POINT(-0.55 35.72)'), -- Bir El Djir
  ('3105', 'SRID=4326;POINT(-0.62 35.65)')  -- Es Senia
) v(official_code, centroid)
where c.official_code = v.official_code;

-- -----------------------------------------------------------------------------
-- Comptes fictifs (le trigger on_auth_user_created crée profils, données privées et rôle PARTICULIER)
-- -----------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'amina@khedma.test', 'Amina', 'Belkacem', '+213555000001', 'fr'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'karim@khedma.test', 'Karim', 'Benali', '+213555000002', 'fr'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'yacine@khedma.test', 'Yacine', 'Haddad', '+213661000003', 'ar'),
      ('44444444-4444-4444-8444-444444444444'::uuid, 'sofiane@khedma.test', 'Sofiane', 'Mansouri', '+213770000004', 'ar'),
      ('55555555-5555-4555-8555-555555555555'::uuid, 'admin@khedma.test', 'Admin', 'Khedma', null, 'fr')
    ) as t(id, email, first_name, last_name, phone, locale)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Khedma2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name,
        'phone', u.phone, 'locale', u.locale, 'terms_accepted', 'true'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

select private.grant_admin('55555555-5555-4555-8555-555555555555');

-- -----------------------------------------------------------------------------
-- Profils artisans (le trigger ajoute le rôle ARTISAN, le métier principal et la commune de base)
-- -----------------------------------------------------------------------------
insert into public.artisan_profiles
  (user_id, business_name, description, years_experience, primary_category_id, base_commune_id, service_radius_km, is_published)
values
  ('22222222-2222-4222-8222-222222222222', 'Karim Plomberie',
    'Plombier chauffagiste : fuites, sanitaires, chauffe-eau. (Profil fictif de démonstration.)', 12,
    (select id from public.categories where slug = 'plomberie'),
    (select id from public.communes where official_code = '1628'), 15, true),
  ('33333333-3333-4333-8333-333333333333', 'Haddad Électricité',
    'Installation et dépannage électrique. (Profil fictif de démonstration.)', 6,
    (select id from public.categories where slug = 'electricite'),
    (select id from public.communes where official_code = '3103'), 20, true),
  ('44444444-4444-4444-8444-444444444444', 'Sofiane Peinture',
    'Peinture intérieure et extérieure. (Profil fictif de démonstration.)', 4,
    (select id from public.categories where slug = 'peinture'),
    (select id from public.communes where official_code = '1618'), 10, true);

insert into public.artisan_services (artisan_id, category_id, price_from) values
  ('22222222-2222-4222-8222-222222222222', (select id from public.categories where slug = 'climatisation'), 6000);

insert into public.artisan_service_areas (artisan_id, commune_id)
select '22222222-2222-4222-8222-222222222222', id from public.communes where official_code in ('1601', '1618'); -- Alger Centre, Kouba

-- -----------------------------------------------------------------------------
-- Demandes et propositions
-- -----------------------------------------------------------------------------
insert into public.service_requests (id, client_id, category_id, title, description, commune_id, budget_amount, urgency) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
    (select id from public.categories where slug = 'plomberie'),
    'Fuite sous l''évier de la cuisine',
    'Fuite d''eau continue sous l''évier depuis hier soir, le siphon semble fissuré.',
    (select id from public.communes where official_code = '1628'), 5000, 'URGENT'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
    (select id from public.categories where slug = 'peinture'),
    'Peinture d''un salon de 20 m²',
    'Repeindre murs et plafond d''un salon, couleur claire, peinture fournie par mes soins.',
    (select id from public.communes where official_code = '1605'), null, 'LOW'),
  ('a0000000-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444',
    (select id from public.categories where slug = 'electricite'),
    'Installation de prises supplémentaires',
    'Ajouter trois prises dans une chambre et vérifier le tableau électrique.',
    (select id from public.communes where official_code = '3105'), 8000, 'NORMAL');

insert into public.proposals (request_id, artisan_id, amount, message, estimated_days) values
  ('a0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 4500,
    'Je peux passer demain matin pour remplacer le siphon et vérifier les joints. Pièces comprises.', 1),
  ('a0000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 18000,
    'Deux couches sur murs et plafond, protection des sols incluse.', 2),
  ('a0000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 7000,
    'Installation des trois prises avec goulotte et contrôle du tableau.', 1);

-- -----------------------------------------------------------------------------
-- Une prestation terminée et son avis (pour afficher une note réelle sur un profil)
-- -----------------------------------------------------------------------------
insert into public.service_requests (id, client_id, category_id, title, description, commune_id, urgency, status) values
  ('a0000000-0000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444',
    (select id from public.categories where slug = 'plomberie'),
    'Remplacement d''un chauffe-eau',
    'Chauffe-eau de 50 litres à remplacer, ancien modèle hors service.',
    (select id from public.communes where official_code = '1618'), 'NORMAL', 'COMPLETED');

insert into public.proposals (id, request_id, artisan_id, amount, message, estimated_days, status, responded_at) values
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004',
    '22222222-2222-4222-8222-222222222222', 12000, 'Dépose de l''ancien et pose du nouveau chauffe-eau.', 1,
    'ACCEPTED', now() - interval '10 days');

insert into public.jobs (id, request_id, proposal_id, client_id, artisan_id, agreed_amount, status, completion_declared_at, completed_at) values
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004',
    'b0000000-0000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222', 12000, 'COMPLETED',
    now() - interval '8 days', now() - interval '7 days');

-- L'avis est créé « en tant que » le client (le trigger déduit auteur et artisan de la prestation).
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', false);
insert into public.reviews (job_id, rating, comment) values
  ('c0000000-0000-4000-8000-000000000004', 5, 'Travail propre et rapide, je recommande.');
select set_config('request.jwt.claims', '', false);
