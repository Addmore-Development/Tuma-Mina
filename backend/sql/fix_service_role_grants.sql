-- ============================================================================
-- TUMA MINA — fix: service_role missing GRANTs on profiles / supervisor_profiles
--
-- service_role bypasses Row Level Security, but it does NOT automatically
-- bypass ordinary Postgres table GRANTs — those are two separate privilege
-- systems. If a table was created without an explicit grant to service_role
-- (easy to miss, and this project has hit this exact class of bug before —
-- see "Fix customer provisioning.sql"), any Edge Function using the admin
-- client gets "permission denied for table X" even though service_role can
-- see past RLS.
--
-- Safe to re-run.
-- ============================================================================

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.supervisor_profiles to service_role;

-- Belt-and-braces: make sure service_role has full access across the whole
-- schema, not just these two tables, since new tables added later
-- (schema_additions.sql, "Schemacourier.sql", etc.) can hit the exact same
-- gap if they were created without this.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- And make sure anything created AFTER this point inherits the same grants
-- automatically, so this class of bug can't recur on a future migration.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

