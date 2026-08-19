-- Run this FIRST if you already partially ran schema.sql and hit an error.
-- Safely drops everything this project creates, so you can re-run the fixed
-- schema.sql from a clean slate. Safe to run even if some objects don't exist.

drop schema public cascade;
create schema public;
grant all on schema public to postgres, anon, authenticated, service_role;

-- Storage buckets aren't touched by dropping the public schema. Since the
-- original schema.sql run failed before reaching the storage bucket inserts,
-- there's nothing to clean up there — skip straight to re-running schema.sql.
-- (If you DO ever need to remove these buckets later, use Supabase Studio's
-- Storage UI to delete them — direct SQL deletes on storage.* are blocked.)