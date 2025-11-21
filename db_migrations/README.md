# Project Daylight Database Migrations

This directory contains SQL migrations for your Supabase Postgres database.
Per your workflow, you will run these manually in the Supabase SQL editor
or console rather than having the app apply them automatically.

## Files

- `0001_initial_schema.sql`  
  Core schema for the MVP:
  - `profiles` (linked to `auth.users`)
  - `voice_recordings` (audio + transcripts)
  - `events` (timeline entries)
  - `event_participants`
  - `evidence` and `event_evidence`
  - `evidence_mentions`
  - `patterns` and `event_patterns`
  - `action_items`
  - `audit_logs`
  - RLS policies for per-user isolation
  - Timestamp + audit triggers

- `0002_seed_dev_data.sql`  
  Optional seed data for development so the UI has real rows to render.
  Creates:
  - One demo voice recording
  - One incident event (late pickup)
  - One evidence item (photo)
  - Links between them, participants, and a `late_pickup` pattern

## How to Run Migrations

1. Open the **SQL** tab in your Supabase project.
2. Copy the contents of `0001_initial_schema.sql` into a new query.
3. Run the query and confirm it completes without errors.
4. (Optional) Open the **Table Editor** to verify that the tables
   and RLS policies were created as expected.

### Running the Seed Script

1. In Supabase, run:

   ```sql
   select id, email from auth.users;
   ```

   and pick the `id` you want to own the seed data.

2. In `0002_seed_dev_data.sql`, replace **all** instances of:

   ```sql
   '{{USER_ID}}'
   ```

   with that `id` (keep the single quotes).

3. Run `0002_seed_dev_data.sql` in the SQL editor.

4. You should now see:
   - A voice recording row in `public.voice_recordings`
   - An `incident` event in `public.events`
   - An evidence row linked to that event
   - Participants, pattern, and event-pattern rows

## Notes

- All user-facing tables include a `user_id` and have RLS policies
  enforcing `auth.uid() = user_id` (or the equivalent via joins).
- `audit_logs` does **not** have RLS enabled so you can inspect it
  via the Supabase dashboard or a service-role key.
- Future schema changes should be added as new, numbered SQL files
  in this directory rather than editing existing migrations.


