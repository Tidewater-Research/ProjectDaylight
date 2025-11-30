-- Migration: Add is_employee flag to profiles and allow employees to manage their own subscription
-- This enables employees/testers to switch their subscription tier for testing without using service role

-- 1. Add is_employee column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT false;

-- 2. Add comment explaining the column
COMMENT ON COLUMN public.profiles.is_employee IS 'Flag for employees and testers who can manage their own subscription tier';

-- 3. Create RLS policy allowing employees to INSERT their own subscription
CREATE POLICY "Employees can insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_employee = true
  )
);

-- 4. Create RLS policy allowing employees to UPDATE their own subscription
CREATE POLICY "Employees can update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_employee = true
  )
)
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_employee = true
  )
);

-- 5. Create RLS policy allowing employees to DELETE their own subscription
CREATE POLICY "Employees can delete own subscription"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_employee = true
  )
);

-- 6. Ensure employees can SELECT their own subscription (may already exist, but ensure it)
-- This is likely already covered by existing RLS, but adding for completeness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' 
    AND policyname = 'Users can view own subscription'
  ) THEN
    CREATE POLICY "Users can view own subscription"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- 7. Set Kyle Johnson as an employee (for testing)
UPDATE public.profiles
SET is_employee = true
WHERE id = 'b76344f8-81e1-4308-b2c3-8f8b452aa697';

