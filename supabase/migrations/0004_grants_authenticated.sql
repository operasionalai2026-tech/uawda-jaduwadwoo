-- Fix: 0003 only granted service_role. The anon/authenticated Postgres roles
-- (used by real logged-in sessions through PostgREST) also need base table
-- grants — RLS policies only filter rows *after* this grant check passes.
-- Table-level access stays wide open here; RLS policies do the real
-- restriction, per the standard Supabase pattern.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
