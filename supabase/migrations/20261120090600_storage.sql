-- =============================================================================
-- KHD-003 — Stockage : buckets et politiques d'accès
-- =============================================================================
-- Convention de chemins : le premier dossier identifie le propriétaire (ou la conversation).
--   avatars                 <user_id>/<fichier>                      public (photo de profil)
--   portfolio               <artisan_id>/<item_id>/<fichier>         public (réalisations)
--   request-images          <client_id>/<request_id>/<fichier>       privé, URL signées
--   message-attachments     <conversation_id>/<sender_id>/<fichier>  privé, URL signées
--   verification-documents  <artisan_id>/<fichier>                   privé, admins uniquement
-- Les buckets privés ne sont lisibles que via des URL signées de courte durée.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio', 'portfolio', true, 5 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('request-images', 'request-images', false, 5 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('message-attachments', 'message-attachments', false, 10 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('verification-documents', 'verification-documents', false, 10 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- avatars et portfolio : écriture dans son propre dossier uniquement.
-- (La lecture publique passe par l'URL publique du bucket, sans politique SELECT.)
-- -----------------------------------------------------------------------------
-- Lecture via l'API par le propriétaire : nécessaire au remplacement (upsert) d'un fichier.
create policy "avatars et portfolio: lecture de son dossier" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'portfolio')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "avatars: ajout dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: remplacement dans son dossier" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: suppression dans son dossier" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "portfolio: ajout par l'artisan" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.has_role('ARTISAN'))
  );
create policy "portfolio: suppression par l'artisan" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- request-images : le demandeur dépose ; lecture si la demande est visible (même règle que la table).
-- -----------------------------------------------------------------------------
create policy "request-images: ajout par le demandeur" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.service_requests r
      where r.id::text = (storage.foldername(name))[2]
        and r.client_id = (select auth.uid()) and r.status = 'OPEN'
    )
  );
create policy "request-images: lecture si demande visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-images'
    and exists (
      select 1 from public.service_requests r
      where r.id::text = (storage.foldername(name))[2] and private.can_view_request(r.id)
    )
  );
create policy "request-images: suppression par le demandeur" on storage.objects
  for delete to authenticated
  using (bucket_id = 'request-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- message-attachments : membres de la conversation uniquement.
-- -----------------------------------------------------------------------------
create policy "message-attachments: ajout par un membre" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and private.is_conversation_member(c.id)
        and not private.conversation_is_blocked(c.id)
    )
  );
create policy "message-attachments: lecture par les membres" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1] and private.is_conversation_member(c.id)
    )
  );

-- -----------------------------------------------------------------------------
-- verification-documents : dépôt par l'artisan, lecture par l'artisan et les administrateurs.
-- Aucune suppression ni modification par l'artisan (preuve conservée pour la décision).
-- -----------------------------------------------------------------------------
create policy "verification-documents: dépôt par l'artisan" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.has_role('ARTISAN'))
  );
create policy "verification-documents: lecture restreinte" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );
