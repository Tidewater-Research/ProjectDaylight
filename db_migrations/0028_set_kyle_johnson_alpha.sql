-- Migration: Set all users named "Kyle Johnson" to alpha tier
-- This grants alpha access to employees/partners

-- Insert or update subscriptions for users named Kyle Johnson
INSERT INTO subscriptions (user_id, status, plan_tier, billing_interval, current_period_start, current_period_end)
SELECT 
  p.id AS user_id,
  'active'::subscription_status AS status,
  'alpha'::plan_tier AS plan_tier,
  'year'::billing_interval AS billing_interval,
  now() AS current_period_start,
  (now() + INTERVAL '100 years') AS current_period_end  -- Alpha access doesn't expire
FROM profiles p
WHERE p.full_name = 'Kyle Johnson'
ON CONFLICT (user_id) 
DO UPDATE SET 
  plan_tier = 'alpha',
  status = 'active',
  current_period_end = (now() + INTERVAL '100 years'),
  updated_at = now();

