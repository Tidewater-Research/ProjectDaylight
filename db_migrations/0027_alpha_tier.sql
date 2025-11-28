-- Migration: Add alpha tier for employees and early partners
-- Alpha tier gets all features unlocked for free (no Stripe integration needed)

-- Add 'alpha' to the plan_tier enum
ALTER TYPE plan_tier ADD VALUE IF NOT EXISTS 'alpha' AFTER 'free';

-- Add a comment for documentation
COMMENT ON TYPE plan_tier IS 'Plan tiers: free (default), alpha (employees/partners), starter, pro, enterprise';

