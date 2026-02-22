-- Keep quota accounting behind the atomic answer-recording RPC.
REVOKE EXECUTE ON FUNCTION public.increment_daily_usage() FROM authenticated;

