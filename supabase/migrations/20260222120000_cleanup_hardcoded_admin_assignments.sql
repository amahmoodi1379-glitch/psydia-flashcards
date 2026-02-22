-- Cleanup migration: remove historical hardcoded admin assignments.
-- Keeps migration history traceable while allowing environment-based bootstrap.
DELETE FROM public.user_roles
WHERE role = 'admin'::app_role
  AND user_id IN (
    '29a46044-3521-4bcf-819b-d40b06a06002'::uuid,
    'dcbe33f1-24da-411f-9c77-bc55bf7e2aa9'::uuid
  );
