-- Audit de sécurité Khedma DZ — LECTURE SEULE.
-- Chaque ligne : contrôle | statut (OK / FAIL / INFO) | détail.  Un seul FAIL fait échouer « pnpm cloud <cible> verify ».
set session characteristics as transaction read only;
\pset footer off

with
public_tables as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
-- Colonnes qu'aucun client ne doit pouvoir écrire directement (transitions côté serveur uniquement).
protected_columns(tbl, col) as (values
  ('profiles', 'status'), ('profiles', 'suspended_at'),
  ('profile_private', 'phone_verified_at'),
  ('artisan_profiles', 'verification_status'), ('artisan_profiles', 'verified_at'),
  ('artisan_profiles', 'rating_avg'), ('artisan_profiles', 'review_count'),
  ('service_requests', 'status'), ('service_requests', 'cancelled_at'),
  ('proposals', 'status'), ('proposals', 'responded_at'), ('proposals', 'withdrawn_at'),
  ('jobs', 'status'), ('jobs', 'completed_at'),
  ('reviews', 'status'), ('reviews', 'author_id'), ('reviews', 'artisan_id'),
  ('reports', 'status'), ('reports', 'handled_by'),
  ('verification_requests', 'status'), ('verification_requests', 'reviewed_by'),
  ('notifications', 'user_id'), ('notifications', 'type')
),
expected_buckets(id, is_public) as (values
  ('avatars', true), ('portfolio', false), ('request-images', false),
  ('message-attachments', false), ('verification-documents', false)
),
-- Fonctions privées volontairement appelables depuis les politiques RLS.
allowed_private_fns(name, role) as (values
  ('is_admin', 'anon'), ('normalize_search', 'anon'),
  ('is_admin', 'authenticated'), ('normalize_search', 'authenticated'),
  ('is_active_user', 'authenticated'), ('has_role', 'authenticated'),
  ('is_public_artisan', 'authenticated'), ('artisan_matches_request', 'authenticated'),
  ('can_view_request', 'authenticated'), ('can_view_request_private', 'authenticated'),
  ('is_conversation_member', 'authenticated'), ('is_blocked_between', 'authenticated'),
  ('conversation_is_blocked', 'authenticated'),
  -- KHD-008-SEC : évaluée par la politique de lecture du bucket privé « portfolio ».
  ('can_read_portfolio_object', 'authenticated')
),
checks(ordre, controle, statut, detail) as (
  select 1, 'RLS activée sur toutes les tables public',
    case when count(*) filter (where not relrowsecurity) = 0 and count(*) > 0 then 'OK' else 'FAIL' end,
    coalesce(string_agg(relname, ', ') filter (where not relrowsecurity), count(*) || ' tables protégées')
  from public_tables

  union all
  select 2, 'Tables sans aucune politique (accès refusé à tous)',
    case when count(*) = 0 then 'OK' else 'INFO' end,
    coalesce(string_agg(t.relname, ', '), '—')
  from public_tables t where not exists (select 1 from pg_policy p where p.polrelid = t.oid)

  union all
  select 3, 'Rôle anon : lecture des seuls référentiels',
    case when count(*) = 0 then 'OK' else 'FAIL' end,
    coalesce(string_agg(t.relname || ':' || p.priv, ', '), 'wilayas, communes, categories en lecture')
  from public_tables t
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
  where (case when p.priv in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
              then has_any_column_privilege('anon', t.oid, p.priv)
              else has_table_privilege('anon', t.oid, p.priv) end)
    and not (p.priv = 'SELECT' and t.relname in ('wilayas', 'communes', 'categories'))

  union all
  select 4, 'Colonnes protégées non modifiables par les utilisateurs',
    case when count(*) = 0 then 'OK' else 'FAIL' end,
    coalesce(string_agg(tbl || '.' || col || ' (' || priv || ')', ', '), (select count(*) from protected_columns) || ' colonnes vérifiées')
  from protected_columns
  cross join (values ('INSERT'), ('UPDATE')) p(priv)
  where to_regclass('public.' || tbl) is not null
    and has_column_privilege('authenticated', ('public.' || tbl)::regclass, col, priv)

  union all
  select 5, 'Prestations (jobs) : aucune écriture directe',
    case when bool_or(has_any_column_privilege('authenticated', 'public.jobs'::regclass, p.priv)
                      or has_table_privilege('authenticated', 'public.jobs'::regclass, 'DELETE')) then 'FAIL' else 'OK' end,
    'INSERT / UPDATE / DELETE refusés'
  from (values ('INSERT'), ('UPDATE')) p(priv)

  union all
  select 6, 'Table des administrateurs inaccessible via l''API',
    case when has_table_privilege('authenticated', 'private.admins', 'SELECT')
           or has_table_privilege('anon', 'private.admins', 'SELECT') then 'FAIL' else 'OK' end,
    'private.admins'

  union all
  select 7, 'Fonctions SECURITY DEFINER avec search_path figé',
    case when count(*) = 0 then 'OK' else 'FAIL' end,
    coalesce(string_agg(n.nspname || '.' || p.proname, ', '), '—')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')

  union all
  select 8, 'Fonctions privées exécutables uniquement si prévu',
    case when count(*) = 0 then 'OK' else 'FAIL' end,
    coalesce(string_agg(distinct p.proname || ' → ' || r.role, ', '), '—')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) r(role)
  where n.nspname = 'private'
    and has_function_privilege(r.role, p.oid, 'EXECUTE')
    and not exists (select 1 from allowed_private_fns a where a.name = p.proname and a.role = r.role)

  union all
  select 9, 'Attribution du rôle admin réservée au propriétaire',
    case when has_function_privilege('authenticated', 'private.grant_admin(uuid, uuid)', 'EXECUTE')
           or has_function_privilege('service_role', 'private.grant_admin(uuid, uuid)', 'EXECUTE')
         then 'FAIL' else 'OK' end,
    'private.grant_admin'

  union all
  select 10, 'Création de profil à l''inscription (trigger auth.users)',
    case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass)
         then 'OK' else 'FAIL' end,
    'on_auth_user_created'

  union all
  select 11, 'PostGIS opérationnel (distance Proche A → Proche B ≈ 3,7 km)',
    case when abs(extensions.st_distance(
                'SRID=4326;POINT(3.00 36.70)'::extensions.geography,
                'SRID=4326;POINT(3.04 36.71)'::extensions.geography) - 3740) < 150
         then 'OK' else 'FAIL' end,
    extensions.postgis_lib_version() || ', ' || round(extensions.st_distance(
      'SRID=4326;POINT(3.00 36.70)'::extensions.geography,
      'SRID=4326;POINT(3.04 36.71)'::extensions.geography))::text || ' m'

  union all
  select 12, 'Index géographique (GiST) sur communes.centroid',
    case when exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'communes_centroid_idx')
         then 'OK' else 'FAIL' end,
    'communes_centroid_idx'

  union all
  select 13, 'Buckets Storage : présence et visibilité',
    case when count(*) filter (where b.id is null or b.public <> e.is_public) = 0 then 'OK' else 'FAIL' end,
    string_agg(e.id || case when b.id is null then ' (absent)' when b.public then ' (public)' else ' (privé)' end, ', ')
  from expected_buckets e left join storage.buckets b on b.id = e.id

  union all
  select 14, 'Buckets : taille et formats limités',
    case when count(*) filter (where b.file_size_limit is null or b.allowed_mime_types is null) = 0 then 'OK' else 'FAIL' end,
    string_agg(b.id || ' ≤ ' || (b.file_size_limit / 1048576)::text || ' Mo', ', ')
  from storage.buckets b where b.id in (select id from expected_buckets)

  union all
  -- Liste exacte des politiques Storage (migration storage + KHD-008-SEC) : toute absence est signalée.
  select 15, 'Politiques Storage (storage.objects)',
    case when count(*) filter (where p.policyname is null) = 0 then 'OK' else 'FAIL' end,
    case when count(*) filter (where p.policyname is null) = 0
      then count(*) || ' politiques présentes sur ' || count(*)
      else 'absentes : ' || string_agg(e.name, ', ') filter (where p.policyname is null) end
  from (values
    ('avatars et portfolio: lecture de son dossier'),
    ('avatars: ajout dans son dossier'), ('avatars: remplacement dans son dossier'),
    ('avatars: suppression dans son dossier'),
    ('portfolio: ajout par l''artisan'), ('portfolio: suppression par l''artisan'),
    ('portfolio: lecture des réalisations autorisées'),
    ('request-images: ajout par le demandeur'), ('request-images: lecture si demande visible'),
    ('request-images: suppression par le demandeur'),
    ('message-attachments: ajout par un membre'), ('message-attachments: lecture par les membres'),
    ('verification-documents: dépôt par l''artisan'), ('verification-documents: lecture restreinte')
  ) e(name)
  left join pg_policies p on p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = e.name

  union all
  select 16, 'Realtime : messages et notifications publiés',
    case when count(*) = 2 then 'OK' else 'FAIL' end,
    coalesce(string_agg(tablename, ', '), '—')
  from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('messages', 'notifications')

  union all
  select 17, 'Téléphone professionnel illisible par les autres utilisateurs (KHD-008)',
    case when has_column_privilege('authenticated', 'public.artisan_profiles'::regclass, 'professional_phone', 'SELECT')
         or has_column_privilege('anon', 'public.artisan_profiles'::regclass, 'professional_phone', 'SELECT')
      then 'FAIL' else 'OK' end,
    'artisan_profiles.professional_phone (lecture via get_my_professional_phone)'

  union all
  select 18, 'Profil artisan : publication contrôlée par le serveur (KHD-008)',
    case when exists (select 1 from pg_trigger where tgname = 'artisan_profiles_check_publication' and not tgisinternal)
         and (select column_default from information_schema.columns
              where table_schema = 'public' and table_name = 'artisan_profiles' and column_name = 'is_published') = 'false'
      then 'OK' else 'FAIL' end,
    'brouillon par défaut, description et zone exigées'
)
select controle as "Contrôle", statut as "Statut", detail as "Détail" from checks order by ordre;
