-- 0014_audit_logs_rls_and_function_hardening.sql
-- Project Daylight - Lock down audit_logs visibility and harden trigger functions
--
-- This migration is intended to be run in your Supabase project's SQL editor.
--
-- Goals:
-- - Enable RLS on public.audit_logs so that normal client roles cannot read it
-- - Keep audit logging working via triggers
-- - Fix Supabase security lints about mutable function search_path on:
--     - public.set_updated_at()
--     - public.record_audit()
--
-- Notes:
-- - You (as an admin) can still inspect audit_logs directly via the Supabase
--   SQL editor or a service role key; table owners and BYPASSRLS roles bypass RLS.
-- - We do NOT create any SELECT policy on audit_logs, so client roles
--   cannot read from it through PostgREST.

------------------------------------------------------------
-- Enable RLS on audit_logs (no client read policies)
------------------------------------------------------------

alter table public.audit_logs
  enable row level security;

-- Intentionally do NOT create any SELECT policy here.
-- This keeps audit_logs write-only from the perspective of client roles.
-- Admins and table owners can still query the table directly.

------------------------------------------------------------
-- Harden trigger functions (search_path + security)
------------------------------------------------------------

-- Ensure updated_at maintenance runs with a fixed search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Ensure audit logging runs with a fixed search_path
-- and is robust under RLS on public.audit_logs.
-- This function should be owned by a role that can write to audit_logs.
create or replace function public.record_audit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (table_name, record_id, action, changed_by, new_data)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, record_id, action, changed_by, old_data)
    values (tg_table_name, old.id, tg_op, auth.uid(), to_jsonb(old));
    return old;
  end if;

  return null;
end;
$$;


