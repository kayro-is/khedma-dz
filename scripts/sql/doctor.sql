-- Diagnostic d'un projet Supabase — LECTURE SEULE (aucune écriture).
-- Sert notamment à vérifier qu'un projet ne contient pas déjà des données avant toute migration.
set session characteristics as transaction read only;

select 'Serveur PostgreSQL', current_setting('server_version');

select 'Extension ' || name,
       coalesce('installée (' || installed_version || ')', 'disponible (' || default_version || ')')
from pg_available_extensions
where name in ('postgis', 'pg_trgm', 'unaccent', 'pgtap', 'pgcrypto')
order by name;

select 'Tables existantes dans public', count(*)::text from pg_tables where schemaname = 'public';
select 'Liste des tables public', coalesce(string_agg(tablename, ', ' order by tablename), '(aucune)')
from pg_tables where schemaname = 'public';

select 'Historique des migrations',
  case
    when to_regclass('supabase_migrations.schema_migrations') is null then 'aucun (projet vierge)'
    else (xpath('/row/c/text()', query_to_xml(
      'select count(*) || '' migration(s), dernière : '' || coalesce(max(version), ''-'') as c from supabase_migrations.schema_migrations',
      false, true, '')))[1]::text
  end;

select 'Comptes utilisateurs (auth.users)', count(*)::text from auth.users;
select 'Buckets Storage', coalesce(string_agg(id, ', ' order by id), '(aucun)') from storage.buckets;
