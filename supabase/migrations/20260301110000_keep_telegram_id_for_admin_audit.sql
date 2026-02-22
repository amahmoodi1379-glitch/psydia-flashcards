-- Telegram OAuth/WebApp flow has been removed from the client and edge functions.
-- We intentionally keep profiles.telegram_id for admin visibility, search, and historical audit.
-- This migration documents that decision explicitly.

COMMENT ON COLUMN public.profiles.telegram_id IS
'Retained after removing telegram-auth flow; used for admin visibility/search and historical traceability.';
