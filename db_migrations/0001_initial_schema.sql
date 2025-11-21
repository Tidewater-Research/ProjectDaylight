-- 0001_initial_schema.sql
-- Project Daylight - Core database schema, RLS, triggers, and audit logging
--
-- This migration is intended to be run in your Supabase project's SQL editor.
-- It defines the core data model for:
-- - Voice recordings and transcripts
-- - Extracted events (which power the timeline)
-- - Evidence items and their links to events
-- - Action items and patterns
-- - Basic user profile layer on top of auth.users
-- - Row Level Security (RLS) policies
-- - Timestamps and audit trails for court credibility

------------------------------------------------------------
-- Extensions
------------------------------------------------------------

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists "pgcrypto" with schema extensions;

------------------------------------------------------------
-- Profiles / User metadata
------------------------------------------------------------

create table if not exists public.profiles (
  -- Use auth.users.id as the primary key
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

------------------------------------------------------------
-- Voice recordings (raw audio + transcripts)
------------------------------------------------------------

create table if not exists public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Storage location in Supabase Storage (bucket + path, or just path if you standardize the bucket)
  storage_path text,
  original_filename text,
  mime_type text,

  -- Full text transcript returned by Whisper
  transcript text,

  -- Metadata from the recording / transcription
  recording_timestamp timestamptz,
  recording_duration_seconds integer,
  transcription_confidence numeric,

  -- Optional: raw extraction JSON payload from the LLM for debugging
  extraction_raw jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voice_recordings_user_id_created_at
  on public.voice_recordings (user_id, created_at desc);

alter table public.voice_recordings enable row level security;

create policy "Users can manage own voice recordings"
  on public.voice_recordings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Events (core timeline entries)
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum ('incident', 'positive', 'medical', 'school', 'communication', 'legal');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'timestamp_precision') then
    create type timestamp_precision as enum ('exact', 'day', 'approximate', 'unknown');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'welfare_impact') then
    create type welfare_impact as enum ('none', 'minor', 'moderate', 'significant', 'positive', 'unknown');
  end if;
end;
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Optional link back to the source voice recording
  recording_id uuid references public.voice_recordings (id) on delete set null,

  type event_type not null,
  title text not null,
  description text not null,

  primary_timestamp timestamptz,
  timestamp_precision timestamp_precision not null default 'unknown',
  duration_minutes integer,
  location text,

  child_involved boolean not null default false,

  -- Custody relevance markers
  agreement_violation boolean,
  safety_concern boolean,
  welfare_impact welfare_impact not null default 'unknown',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_user_id_primary_timestamp
  on public.events (user_id, primary_timestamp desc nulls last);

alter table public.events enable row level security;

create policy "Users can manage own events"
  on public.events
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Event participants
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'participant_role') then
    create type participant_role as enum ('primary', 'witness', 'professional');
  end if;
end;
$$;

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,

  role participant_role not null,
  -- Human-readable label, e.g. "co-parent", "Emma", "Dr. Smith (teacher)"
  label text not null
);

create index if not exists idx_event_participants_event_id
  on public.event_participants (event_id);

create index if not exists idx_event_participants_user_id
  on public.event_participants (user_id);

alter table public.event_participants enable row level security;

create policy "Users can manage own event participants"
  on public.event_participants
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Evidence items (stored documents, images, emails, etc.)
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evidence_source_type') then
    create type evidence_source_type as enum ('text', 'email', 'photo', 'document', 'recording', 'other');
  end if;
end;
$$;

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  source_type evidence_source_type not null,

  -- Storage location in Supabase Storage (bucket + path, or just path)
  storage_path text,
  original_filename text,
  mime_type text,

  summary text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidence_user_id_created_at
  on public.evidence (user_id, created_at desc);

alter table public.evidence enable row level security;

create policy "Users can manage own evidence"
  on public.evidence
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Event ↔ Evidence linking (timeline entries with supporting docs)
------------------------------------------------------------

create table if not exists public.event_evidence (
  event_id uuid not null references public.events (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (event_id, evidence_id)
);

create index if not exists idx_event_evidence_evidence_id
  on public.event_evidence (evidence_id);

alter table public.event_evidence enable row level security;

create policy "Users can manage own event evidence links"
  on public.event_evidence
  using (
    auth.uid() = (
      select e.user_id from public.events e where e.id = event_evidence.event_id
    )
  )
  with check (
    auth.uid() = (
      select e.user_id from public.events e where e.id = event_evidence.event_id
    )
  );

------------------------------------------------------------
-- Evidence mentions (from transcripts, may not yet be uploaded)
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evidence_mention_status') then
    create type evidence_mention_status as enum ('have', 'need_to_get', 'need_to_create');
  end if;
end;
$$;

create table if not exists public.evidence_mentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,

  type evidence_source_type not null,
  description text not null,
  status evidence_mention_status not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_mentions_event_id
  on public.evidence_mentions (event_id);

alter table public.evidence_mentions enable row level security;

create policy "Users can manage own evidence mentions"
  on public.evidence_mentions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Patterns and Event ↔ Pattern mapping
------------------------------------------------------------

create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Machine- or code-friendly key, e.g. "late_pickup"
  key text not null,
  -- Human-friendly label, e.g. "Repeated late pickups from school"
  label text,

  created_at timestamptz not null default now(),

  unique (user_id, key)
);

alter table public.patterns enable row level security;

create policy "Users can manage own patterns"
  on public.patterns
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.event_patterns (
  event_id uuid not null references public.events (id) on delete cascade,
  pattern_id uuid not null references public.patterns (id) on delete cascade,
  primary key (event_id, pattern_id)
);

alter table public.event_patterns enable row level security;

create policy "Users can manage own event patterns"
  on public.event_patterns
  using (
    auth.uid() = (
      select e.user_id from public.events e where e.id = event_patterns.event_id
    )
  )
  with check (
    auth.uid() = (
      select e.user_id from public.events e where e.id = event_patterns.event_id
    )
  );

------------------------------------------------------------
-- Action items / follow-ups
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'action_priority') then
    create type action_priority as enum ('urgent', 'high', 'normal', 'low');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'action_type') then
    create type action_type as enum ('document', 'contact', 'file', 'obtain', 'other');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'action_status') then
    create type action_status as enum ('open', 'in_progress', 'done', 'cancelled');
  end if;
end;
$$;

create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,

  priority action_priority not null default 'normal',
  type action_type not null default 'other',
  description text not null,
  deadline timestamptz,
  status action_status not null default 'open',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_action_items_user_id_status_deadline
  on public.action_items (user_id, status, deadline nulls last);

alter table public.action_items enable row level security;

create policy "Users can manage own action items"
  on public.action_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- Audit logging
------------------------------------------------------------

create table if not exists public.audit_logs (
  id bigserial primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamptz not null default now(),
  changed_by uuid,
  old_data jsonb,
  new_data jsonb
);

create index if not exists idx_audit_logs_table_name_changed_at
  on public.audit_logs (table_name, changed_at desc);

-- RLS is intentionally left disabled on audit_logs so it can be inspected
-- via a service role or Supabase dashboard for credibility.

------------------------------------------------------------
-- Trigger functions for timestamps and audit trails
------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_audit()
returns trigger
language plpgsql
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

------------------------------------------------------------
-- Attach triggers to core tables
------------------------------------------------------------

-- updated_at maintenance
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger voice_recordings_set_updated_at
before update on public.voice_recordings
for each row
execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

create trigger evidence_set_updated_at
before update on public.evidence
for each row
execute function public.set_updated_at();

create trigger action_items_set_updated_at
before update on public.action_items
for each row
execute function public.set_updated_at();

-- Audit logging for core business tables
create trigger audit_voice_recordings
after insert or update or delete on public.voice_recordings
for each row
execute function public.record_audit();

create trigger audit_events
after insert or update or delete on public.events
for each row
execute function public.record_audit();

create trigger audit_evidence
after insert or update or delete on public.evidence
for each row
execute function public.record_audit();

create trigger audit_action_items
after insert or update or delete on public.action_items
for each row
execute function public.record_audit();


