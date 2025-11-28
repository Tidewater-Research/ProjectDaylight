-- Migration: Reset UTC timezones to NULL to trigger auto-detection
-- Users with timezone = 'UTC' will have their browser timezone auto-detected on next visit

UPDATE profiles
SET 
  timezone = NULL,
  updated_at = now()
WHERE timezone = 'UTC';

