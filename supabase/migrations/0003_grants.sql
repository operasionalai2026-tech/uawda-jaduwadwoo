-- Fix: tables created via SQL Editor don't always inherit the project's
-- default privilege grants. Explicitly grant service_role full access
-- (it already bypasses RLS; this just fixes the underlying table grants),
-- and set default privileges so future tables in this schema inherit it too.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
