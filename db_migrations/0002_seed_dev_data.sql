-- 0002_seed_dev_data.sql
-- Project Daylight - Optional development seed data
--
-- This migration is OPTIONAL and meant to provide a small amount of
-- realistic data so the UI has something to render while wiring up
-- real Supabase queries.
--
-- IMPORTANT:
-- - Replace {{USER_ID}} with a real auth.users.id value before running.
-- - You can obtain a user id via:
--     select id, email from auth.users;
--
-- After replacing the placeholder, you can run this script in the
-- Supabase SQL editor.

------------------------------------------------------------
-- Replace this with a real user id from auth.users
------------------------------------------------------------

-- Example:
--   -- select id, email from auth.users limit 5;
--   -- Then replace the placeholder below with your user id.

-- BEGIN PLACEHOLDER - UPDATE BEFORE RUNNING
-- e.g. '7f6b1b7a-1234-5678-9abc-def012345678'
select '{{USER_ID}}'::uuid as seed_user_id;
-- END PLACEHOLDER

------------------------------------------------------------
-- Seed a demo voice recording and events
------------------------------------------------------------

with seed_params as (
  select '{{USER_ID}}'::uuid as user_id
),
insert_recording as (
  insert into public.voice_recordings (
    user_id,
    storage_path,
    original_filename,
    mime_type,
    transcript,
    recording_timestamp,
    recording_duration_seconds,
    transcription_confidence
  )
  select
    sp.user_id,
    'voice-recordings/demo-late-pickup.wav',
    'demo-late-pickup.wav',
    'audio/wav',
    'Just picked up Emma from school, it''s 4:15 PM and her dad was supposed to get her at 3:30. The school called me because they couldn''t reach him. This is the third time this month. The office staff saw the whole thing and Emma was really upset, crying in the office. I took a photo of the sign-in sheet showing the time.',
    now() - interval '1 hour',
    120,
    0.95
  from seed_params sp
  returning id, user_id
),
insert_event as (
  insert into public.events (
    user_id,
    recording_id,
    type,
    title,
    description,
    primary_timestamp,
    timestamp_precision,
    duration_minutes,
    location,
    child_involved,
    agreement_violation,
    safety_concern,
    welfare_impact
  )
  select
    ir.user_id,
    ir.id,
    'incident',
    'Late pickup from school',
    'Co-parent failed to pick up child at 3:30 PM as scheduled. School contacted me at 4:15 PM after being unable to reach co-parent. This is the third occurrence this month.',
    now() - interval '45 minutes',
    'exact',
    45,
    'Jefferson Elementary School',
    true,
    true,
    false,
    'moderate'
  from insert_recording ir
  returning id, user_id
),
insert_evidence as (
  insert into public.evidence (
    user_id,
    source_type,
    storage_path,
    original_filename,
    mime_type,
    summary,
    tags
  )
  select
    se.user_id,
    'photo',
    'evidence/school_pickup_timestamp.jpg',
    'school_pickup_timestamp.jpg',
    'image/jpeg',
    'Screenshot of school clock and hallway showing pickup time after dismissal.',
    array['school', 'pickup', 'timing']
  from insert_event se
  returning id, user_id
),
link_event_evidence as (
  insert into public.event_evidence (event_id, evidence_id, is_primary)
  select
    se.id,
    ie.id,
    true
  from insert_event se
  cross join insert_evidence ie
  returning 1
),
insert_participants as (
  insert into public.event_participants (user_id, event_id, role, label)
  select se.user_id, se.id, 'primary', 'self'
  from insert_event se
  union all
  select se.user_id, se.id, 'primary', 'co-parent'
  from insert_event se
  union all
  select se.user_id, se.id, 'witness', 'school office staff'
  from insert_event se
  returning 1
),
insert_pattern as (
  insert into public.patterns (user_id, key, label)
  select
    se.user_id,
    'late_pickup',
    'Repeated late pickups from school'
  from insert_event se
  on conflict (user_id, key) do update
    set label = excluded.label
  returning id, user_id
)
insert into public.event_patterns (event_id, pattern_id)
select
  se.id,
  ip.id
from insert_event se
cross join insert_pattern ip;


