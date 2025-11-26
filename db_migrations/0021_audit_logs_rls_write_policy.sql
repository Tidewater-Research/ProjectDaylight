-- 0021_audit_logs_rls_write_policy.sql
-- Project Daylight - Allow trigger-based writes to audit_logs under RLS
--
-- Context:
-- - Migration 0014 enabled RLS on public.audit_logs but did not define
--   any INSERT policy.
-- - As a result, trigger function public.record_audit() now fails with:
--     "new row violates row-level security policy for table \"audit_logs\""
--   whenever it tries to insert an audit row.
--
-- Goals:
-- - Keep audit_logs unreadable to normal client roles (no SELECT policies).
-- - Allow trigger-based (and service-role) INSERTs into audit_logs so that
--   auditing works transparently across the app.

begin;

-- Allow inserts into audit_logs for all roles.
-- We use WITH CHECK (true) so that every inserted row passes RLS.
-- No SELECT policy is created, so clients still cannot read from audit_logs
-- via PostgREST; service-role / admin access can still inspect it directly.
create policy audit_logs_allow_all_inserts
  on public.audit_logs
  for insert
  with check (true);

commit;


