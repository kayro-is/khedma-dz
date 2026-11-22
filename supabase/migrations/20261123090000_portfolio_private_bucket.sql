-- =============================================================================
-- KHD-008-SEC — Photos de réalisations : bucket « portfolio » privé
-- =============================================================================
-- Avant : bucket public. Toute photo (y compris d'un profil en brouillon) était lisible par
-- quiconque connaissait son URL, sans aucun contrôle.
-- Après : bucket privé. L'image n'est accessible que par une URL signée de courte durée, que
-- Supabase Storage ne délivre qu'aux utilisateurs autorisés par la politique ci-dessous :
--   * l'artisan lui-même (son dossier), même en brouillon ;
--   * un administrateur ;
--   * tout utilisateur connecté, si la photo appartient à une réalisation d'un artisan PUBLIÉ
--     dont le compte est actif (même règle que la table portfolio_items).
-- Limite assumée : une URL signée déjà délivrée reste utilisable jusqu'à son expiration
-- (durée courte choisie par l'application, 10 minutes). Dépublier un profil empêche toute
-- NOUVELLE URL, sans révoquer instantanément celles déjà émises.
-- Aucun fichier ni aucune donnée n'est déplacé ou supprimé ; les chemins restent identiques.
-- Retour arrière : supabase/rollback/20261123090000_portfolio_private_bucket.down.sql
-- =============================================================================

/** Lecture d'une photo de réalisation (utilisée par la politique Storage). */
create or replace function private.can_read_portfolio_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or (select private.is_admin())
    or exists (
      select 1
      from public.portfolio_images m
      join public.portfolio_items i on i.id = m.item_id
      where m.storage_path = p_name and private.is_public_artisan(i.artisan_id)
    );
$$;
revoke all on function private.can_read_portfolio_object(text) from public, anon;
grant execute on function private.can_read_portfolio_object(text) to authenticated;

-- Délivrance des URL signées et téléchargement : soumis à cette politique (rôle authenticated).
-- Aucune politique pour « anon » : un visiteur non connecté n'a accès à aucune photo.
drop policy if exists "portfolio: lecture des réalisations autorisées" on storage.objects;
create policy "portfolio: lecture des réalisations autorisées" on storage.objects
  for select to authenticated
  using (bucket_id = 'portfolio' and private.can_read_portfolio_object(name));

-- Bucket privé : les URL publiques (/object/public/portfolio/...) cessent de fonctionner.
update storage.buckets set public = false where id = 'portfolio' and public;
