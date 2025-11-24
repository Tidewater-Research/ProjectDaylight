-- 0011_storage_rls_evidence.sql
-- Project Daylight - Supabase Storage RLS for evidence (and future voice) files
--
-- This migration is intended to be run in your Supabase project's SQL editor.
--
-- Goals:
-- - Keep using the existing private bucket "daylight-files"
-- - Enforce that authenticated users can only read/write objects in their own
--   per-user folders within this bucket
-- - Keep service role–based server APIs working (service role bypasses RLS)
--
-- Path conventions (already used by the Nuxt backend):
--   evidence uploads: evidence/{user_id}/{timestamp}-{filename}
--   (voice recordings can later use a similar pattern, e.g. voice-recordings/{user_id}/...)

-- Ensure the bucket exists (idempotent with 0003_storage_setup.sql)
insert into storage.buckets (id, name, public)
values ('daylight-files', 'daylight-files', false)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (safe if already enabled)
alter table storage.objects
  enable row level security;

-- Policy: authenticated users can INSERT objects into their own folders
create policy "Users can upload files to their own folders"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'daylight-files'
  and (
    -- Evidence files: evidence/{auth.uid()}/...
    name like 'evidence/' || auth.uid()::text || '/%'
    -- Future voice recordings (optional): voice-recordings/{auth.uid()}/...
    or name like 'voice-recordings/' || auth.uid()::text || '/%'
  )
);

-- Policy: authenticated users can SELECT objects from their own folders
create policy "Users can read files from their own folders"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'daylight-files'
  and (
    name like 'evidence/' || auth.uid()::text || '/%'
    or name like 'voice-recordings/' || auth.uid()::text || '/%'
  )
);

-- Policy: authenticated users can UPDATE objects in their own folders
create policy "Users can update files in their own folders"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'daylight-files'
  and (
    name like 'evidence/' || auth.uid()::text || '/%'
    or name like 'voice-recordings/' || auth.uid()::text || '/%'
  )
)
with check (
  bucket_id = 'daylight-files'
  and (
    name like 'evidence/' || auth.uid()::text || '/%'
    or name like 'voice-recordings/' || auth.uid()::text || '/%'
  )
);

-- Policy: authenticated users can DELETE objects in their own folders
create policy "Users can delete files from their own folders"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'daylight-files'
  and (
    name like 'evidence/' || auth.uid()::text || '/%'
    or name like 'voice-recordings/' || auth.uid()::text || '/%'
  )
);


