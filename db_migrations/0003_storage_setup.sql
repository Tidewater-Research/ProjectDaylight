-- 0003_storage_setup.sql
-- Project Daylight - Supabase Storage bucket(s) for Milestone 1
--
-- This migration is intended to be run in your Supabase project's SQL editor.
-- It creates a single private bucket that the Nuxt server (using the service
-- role key) will use to store:
-- - Raw voice recordings
-- - Uploaded evidence files (photos, documents, etc.)
--
-- The application code expects this bucket id to be "daylight-files" and
-- stores paths such as:
--   - voice-recordings/{user_id}/{timestamp}-{filename}
--   - evidence/{user_id}/{timestamp}-{filename}

insert into storage.buckets (id, name, public)
values ('daylight-files', 'daylight-files', false)
on conflict (id) do nothing;

-- For MVP we rely on the service role key for all access to this bucket, so
-- no additional storage.objects RLS policies are required. If you later expose
-- direct client-side uploads with the anon key, you should add policies that
-- restrict access to each user's own files.


