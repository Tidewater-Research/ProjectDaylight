-- 0022_audit_logs_authenticated_inserts_only.sql
-- Project Daylight - Restrict audit_logs inserts to authenticated contexts
--
-- Context:
-- - Migration 0021 created a very permissive INSERT policy on public.audit_logs:
--     audit_logs_allow_all_inserts ... with check (true)
-- - That keeps triggers working but also technically allows anon-role inserts
--   if someone talks directly to the REST endpoint with your anon key.
--
-- Goal:
-- - Preserve normal app behavior (trigger-based audit logging for logged-in users).
-- - Disallow inserts into audit_logs from contexts where auth.uid() is null
--   (i.e., purely unauthenticated clients using the anon key directly).

begin;

-- Replace the permissive policy from 0021 with an authenticated-only policy.
drop policy if exists audit_logs_allow_all_inserts
  on public.audit_logs;

create policy audit_logs_allow_authenticated_inserts
  on public.audit_logs
  for insert
  with check (auth.uid() is not null);

commit;


