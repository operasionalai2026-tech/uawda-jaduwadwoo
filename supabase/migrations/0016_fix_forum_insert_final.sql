-- Fix forum_threads INSERT RLS once and for all.
--
-- Problem: after running 0015, the DROP statements removed all INSERT policies
-- but the CREATE might have failed, leaving forum_threads with ZERO insert
-- policies → every insert gets denied by PostgreSQL's default-deny RLS.
--
-- This migration wraps everything in a single DO block so it's atomic.

do $$
begin
  -- 1. Remove every INSERT policy we've ever created (safe: IF EXISTS).
  execute 'drop policy if exists "forum_threads_insert_authenticated" on forum_threads';
  execute 'drop policy if exists "forum_threads_insert_public"        on forum_threads';
  execute 'drop policy if exists "forum_threads_insert_private"       on forum_threads';
  execute 'drop policy if exists "forum_threads_insert_own"           on forum_threads';

  -- 2. Create the single unified INSERT policy.
  --    Any authenticated user can create a thread (created_by must be themselves).
  execute '
    create policy "forum_threads_insert_own" on forum_threads
      for insert with check (
        auth.role() = ''authenticated'' and created_by = auth.uid()
      )
  ';

  raise notice 'forum_threads_insert_own policy created OK';
end $$;

-- Verify: this SELECT should return exactly ONE row named 'forum_threads_insert_own'.
select policyname, cmd, with_check
from pg_policies
where tablename = 'forum_threads' and cmd = 'INSERT';
