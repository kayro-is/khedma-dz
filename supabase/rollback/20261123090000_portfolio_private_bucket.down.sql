-- RETOUR ARRIÈRE de 20261123090000_portfolio_private_bucket.sql (à n'exécuter que sur décision explicite).
-- Rend de nouveau le bucket « portfolio » public et retire la politique de lecture contrôlée.
-- Aucun fichier n'est touché. Attention : toutes les photos redeviennent lisibles par URL publique,
-- y compris celles des profils en brouillon (situation d'avant KHD-008-SEC).
-- Exécution manuelle (projet de TEST) : psql -f supabase/rollback/20261123090000_portfolio_private_bucket.down.sql
begin;
update storage.buckets set public = true where id = 'portfolio' and not public;
drop policy if exists "portfolio: lecture des réalisations autorisées" on storage.objects;
drop function if exists private.can_read_portfolio_object(text);
-- L'application doit alors revenir à getPublicUrl (version KHD-008 de proProfileApi.ts).
commit;
