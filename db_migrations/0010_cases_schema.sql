-- 0010_cases_schema.sql
-- Basic "cases" table for tracking high-level case information
-- (jurisdiction, people, children, goals, and risk flags).
-- Run this in your Supabase project's SQL editor.

------------------------------------------------------------
-- Cases table
------------------------------------------------------------

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Core identifiers
  title text not null,
  case_number text,

  -- Jurisdiction & court
  jurisdiction_state text,
  jurisdiction_county text,
  court_name text,
  case_type text,
  stage text,

  -- People involved
  your_role text,
  opposing_party_name text,
  opposing_party_role text,

  -- Children & parenting
  children_count integer,
  children_summary text,
  parenting_schedule text,

  -- Strategy & risk
  goals_summary text,
  risk_flags text[] not null default '{}',
  notes text,
  next_court_date timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_user_id_created_at
  on public.cases (user_id, created_at desc);

alter table public.cases enable row level security;

create policy "Users can manage own cases"
  on public.cases
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Triggers for updated_at and audit logging
------------------------------------------------------------

create trigger cases_set_updated_at
before update on public.cases
for each row
execute function public.set_updated_at();

create trigger audit_cases
after insert or update or delete on public.cases
for each row
execute function public.record_audit();



