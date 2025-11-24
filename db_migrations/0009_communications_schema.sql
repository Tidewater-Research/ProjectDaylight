-- 0009_communications_schema.sql
-- Structured communications evidence storage (no JSON dumps)
-- This migration adds enum types and a communications table to store
-- structured text/email communications extracted from images.

------------------------------------------------------------
-- Enum types for communications
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'communication_medium') then
    create type communication_medium as enum ('text', 'email', 'unknown');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'communication_direction') then
    create type communication_direction as enum ('incoming', 'outgoing', 'mixed', 'unknown');
  end if;
end;
$$;

------------------------------------------------------------
-- Communications table
------------------------------------------------------------

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Optional links back to the core timeline and evidence tables
  event_id uuid references public.events (id) on delete set null,
  evidence_id uuid references public.evidence (id) on delete set null,

  -- High-level characterization
  medium communication_medium not null default 'unknown',
  direction communication_direction not null default 'unknown',
  subject text,
  summary text not null,
  body_text text not null,

  -- Participants as free-form identities
  from_identity text,
  to_identities text[] not null default '{}',
  other_participants text[] not null default '{}',

  -- Timing and precision
  sent_at timestamptz,
  timestamp_precision timestamp_precision not null default 'unknown',

  -- Custody / welfare markers
  child_involved boolean,
  agreement_violation boolean,
  safety_concern boolean,
  welfare_impact welfare_impact not null default 'unknown',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_communications_user_id_sent_at
  on public.communications (user_id, sent_at desc nulls last);

create index if not exists idx_communications_event_id
  on public.communications (event_id);

create index if not exists idx_communications_evidence_id
  on public.communications (evidence_id);

alter table public.communications enable row level security;

create policy "Users can manage own communications"
  on public.communications
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Triggers for updated_at and audit logging
------------------------------------------------------------

create trigger communications_set_updated_at
before update on public.communications
for each row
execute function public.set_updated_at();

create trigger audit_communications
after insert or update or delete on public.communications
for each row
execute function public.record_audit();


