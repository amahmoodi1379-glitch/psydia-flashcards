-- Drop ALL stale function overloads that accepted explicit user_id parameters.
-- The harden_sensitive_rpcs migration replaced them with auth.uid() versions
-- but never dropped the old signatures, leaving dangerous overloads in the DB.

-- Leaderboard rank functions: (uuid, date) → (date)
DROP FUNCTION IF EXISTS public.get_user_weekly_rank(uuid, date);
DROP FUNCTION IF EXISTS public.get_user_monthly_rank(uuid, date);

-- Subscription/usage functions: (uuid) → ()
DROP FUNCTION IF EXISTS public.get_user_subscription(uuid);
DROP FUNCTION IF EXISTS public.increment_daily_usage(uuid);

-- Mastery functions: (uuid) → ()
DROP FUNCTION IF EXISTS public.get_hierarchical_mastery(uuid);
DROP FUNCTION IF EXISTS public.get_subtopic_mastery(uuid);
