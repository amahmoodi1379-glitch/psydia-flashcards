-- Remove payment logging artifacts after disabling direct gateway payments
DROP TABLE IF EXISTS public.payment_logs;
