-- Migration: Clear stale Stripe IDs from dev testing
-- 
-- This clears Stripe customer/subscription IDs that were created with a different
-- Stripe account or environment. Run this when switching Stripe accounts or
-- when you see "No such customer" errors.
--
-- Standard practice: Dev database uses test keys, prod database uses live keys.
-- No code changes needed - just keep environments separate.

UPDATE subscriptions 
SET 
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  stripe_price_id = NULL,
  plan_tier = 'free',
  status = 'active'
WHERE stripe_customer_id IS NOT NULL;

