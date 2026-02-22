-- 1. Add initial admin user safely (no-op if auth user does not exist)
-- For production bootstrap, prefer environment-driven seeding/deploy scripts.
INSERT INTO public.user_roles (user_id, role)
SELECT 'dcbe33f1-24da-411f-9c77-bc55bf7e2aa9'::uuid, 'admin'::app_role
WHERE EXISTS (
  SELECT 1
  FROM auth.users
  WHERE id = 'dcbe33f1-24da-411f-9c77-bc55bf7e2aa9'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create function to get frequently wrong questions
CREATE OR REPLACE FUNCTION public.get_frequently_wrong_questions(_user_id uuid)
RETURNS TABLE(question_id uuid, wrong_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    al.question_id,
    COUNT(*) as wrong_count
  FROM attempt_logs al
  JOIN questions q ON q.id = al.question_id AND q.is_active = true
  WHERE al.user_id = _user_id 
    AND al.is_correct = false
  GROUP BY al.question_id
  HAVING COUNT(*) >= 2
  ORDER BY wrong_count DESC;
$$;

-- 3. Create function for extended activity (with days parameter)
CREATE OR REPLACE FUNCTION public.get_extended_activity(_user_id uuid, _days integer)
RETURNS TABLE(activity_date date, activity_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as activity_date,
    COUNT(*) as activity_count
  FROM attempt_logs
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE - (_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY activity_date;
$$;

-- 4. Create function to toggle admin role (only admins can use)
CREATE OR REPLACE FUNCTION public.toggle_admin_role(_target_user_id uuid, _make_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;

  IF _make_admin THEN
    -- Add admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove admin role
    DELETE FROM user_roles
    WHERE user_id = _target_user_id AND role = 'admin';
  END IF;

  RETURN true;
END;
$$;