-- Migration: Backfill timezone from auth.users metadata to profiles table
-- Copies timezone from raw_user_meta_data in auth.users to profiles.timezone

UPDATE profiles p
SET 
  timezone = COALESCE(
    u.raw_user_meta_data->>'timezone',
    u.raw_user_meta_data->>'time_zone',
    u.raw_user_meta_data->>'timeZone'
  ),
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.timezone IS NULL  -- Only update if not already set
  AND (
    u.raw_user_meta_data->>'timezone' IS NOT NULL
    OR u.raw_user_meta_data->>'time_zone' IS NOT NULL
    OR u.raw_user_meta_data->>'timeZone' IS NOT NULL
  );

