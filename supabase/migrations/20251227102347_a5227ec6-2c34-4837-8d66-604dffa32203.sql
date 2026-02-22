-- NOTE: Safe admin bootstrap guarded by auth.users existence check.
-- For production bootstrap, prefer environment-driven seeding/deploy scripts.
INSERT INTO public.user_roles (user_id, role)
SELECT '29a46044-3521-4bcf-819b-d40b06a06002'::uuid, 'admin'::app_role
WHERE EXISTS (
  SELECT 1
  FROM auth.users
  WHERE id = '29a46044-3521-4bcf-819b-d40b06a06002'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;
