-- =============================================================================
-- KHD-003 — Durcissement des droits d'exécution des fonctions du schéma private
-- =============================================================================
-- PostgreSQL accorde EXECUTE à PUBLIC sur toute nouvelle fonction. On retire ce droit
-- puis on ne réaccorde que les fonctions utilisées par les politiques RLS.
-- Les fonctions de trigger n'ont pas besoin de ce droit pour se déclencher.
-- =============================================================================

revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- Utilisées par des politiques accessibles aux visiteurs (référentiels) et à la recherche.
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.normalize_search(text) to anon, authenticated;

-- Utilisées par les politiques RLS des utilisateurs connectés (tables et Storage).
grant execute on function
  private.is_active_user(),
  private.has_role(public.business_role),
  private.is_public_artisan(uuid),
  private.artisan_matches_request(uuid),
  private.can_view_request(uuid),
  private.can_view_request_private(uuid),
  private.is_conversation_member(uuid),
  private.is_blocked_between(uuid, uuid),
  private.conversation_is_blocked(uuid)
to authenticated;
