-- Diagnostic des photos (buckets « avatars » et « portfolio ») — LECTURE SEULE, projet de TEST.
-- Aucune adresse e-mail n'est affichée : seulement le début de l'identifiant utilisateur.
set session characteristics as transaction read only;
\pset footer off

\echo '--- Bucket avatars ---'
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'avatars';

\echo '--- Fichiers présents (20 plus récents) ---'
select left(o.name, 8) || '…/' || split_part(o.name, '/', 2) as fichier,
  (o.metadata ->> 'size')::bigint as octets,
  o.metadata ->> 'mimetype' as type,
  to_char(o.created_at at time zone 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') as envoye_le,
  exists (select 1 from public.profiles p where p.avatar_path = o.name) as utilise_par_un_profil
from storage.objects o
where o.bucket_id = 'avatars'
order by o.created_at desc
limit 20;

\echo '--- Profils avec une photo enregistrée ---'
select left(p.id::text, 8) || '…' as utilisateur,
  split_part(p.avatar_path, '/', 2) as avatar,
  o.id is not null as fichier_existe,
  (o.metadata ->> 'size')::bigint as octets
from public.profiles p
left join storage.objects o on o.bucket_id = 'avatars' and o.name = p.avatar_path
where p.avatar_path is not null
order by p.updated_at desc;

\echo '--- Galerie (bucket portfolio) : cohérence fichiers / réalisations ---'
select
  (select count(*) from public.portfolio_items) as realisations,
  (select count(*) from public.portfolio_images) as images,
  (select count(*) from storage.objects where bucket_id = 'portfolio') as fichiers,
  (select count(*) from public.portfolio_images m
     where not exists (select 1 from storage.objects o where o.bucket_id = 'portfolio' and o.name = m.storage_path)) as images_sans_fichier,
  (select count(*) from storage.objects o where o.bucket_id = 'portfolio'
     and not exists (select 1 from public.portfolio_images m where m.storage_path = o.name)) as fichiers_orphelins,
  (select count(*) from public.portfolio_items i
     where not exists (select 1 from public.portfolio_images m where m.item_id = i.id)) as realisations_sans_photo,
  (select count(*) from storage.objects where bucket_id = 'portfolio'
     and (metadata ->> 'size')::bigint < 100) as fichiers_suspects_moins_100_octets;
