-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'advanced', 'smart');

-- Create subscription duration enum  
CREATE TYPE public.subscription_duration AS ENUM ('monthly', 'quarterly');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  duration subscription_duration NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payment logs table for tracking Zarinpal payments
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  authority VARCHAR(36) NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  plan subscription_plan NOT NULL,
  duration subscription_duration NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ref_id VARCHAR(50) NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookmarks table for advanced plan
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Create daily usage tracking table
CREATE TABLE public.daily_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment logs policies
CREATE POLICY "Users can read own payment logs"
  ON public.payment_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment logs"
  ON public.payment_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Bookmarks policies
CREATE POLICY "Users can read own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Daily usage policies
CREATE POLICY "Users can read own daily usage"
  ON public.daily_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily usage"
  ON public.daily_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily usage"
  ON public.daily_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_logs_updated_at
  BEFORE UPDATE ON public.payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to get user subscription with plan details
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id uuid)
RETURNS TABLE(
  plan subscription_plan,
  expires_at timestamp with time zone,
  is_active boolean,
  daily_limit integer,
  today_usage integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_usage integer;
BEGIN
  -- Get today's usage
  SELECT COALESCE(du.question_count, 0) INTO v_today_usage
  FROM daily_usage du
  WHERE du.user_id = _user_id AND du.usage_date = CURRENT_DATE;

  RETURN QUERY
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan) as plan,
    s.expires_at,
    COALESCE(s.is_active AND (s.expires_at IS NULL OR s.expires_at > now()), true) as is_active,
    COALESCE(s.daily_limit, 10) as daily_limit,
    COALESCE(v_today_usage, 0) as today_usage
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE p.id = _user_id;
END;
$$;

-- Function to increment daily usage
CREATE OR REPLACE FUNCTION public.increment_daily_usage(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_usage integer;
  v_daily_limit integer;
  v_plan subscription_plan;
BEGIN
  -- Get current subscription
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.daily_limit, 10)
  INTO v_plan, v_daily_limit
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.is_active = true
  WHERE p.id = _user_id;

  -- Unlimited for paid plans
  IF v_plan IN ('basic', 'advanced', 'smart') THEN
    RETURN true;
  END IF;

  -- Get current usage
  SELECT COALESCE(question_count, 0) INTO v_current_usage
  FROM daily_usage
  WHERE user_id = _user_id AND usage_date = CURRENT_DATE;

  -- Check limit
  IF v_current_usage >= v_daily_limit THEN
    RETURN false;
  END IF;

  -- Upsert usage
  INSERT INTO daily_usage (user_id, usage_date, question_count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET question_count = daily_usage.question_count + 1;

  RETURN true;
END;
$$;

-- Function for hierarchical mastery data
CREATE OR REPLACE FUNCTION public.get_hierarchical_mastery(_user_id uuid)
RETURNS TABLE(
  subject_id uuid,
  subject_name text,
  subject_mastery integer,
  topic_id uuid,
  topic_name text,
  topic_mastery integer,
  subtopic_id uuid,
  subtopic_name text,
  subtopic_mastery integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_mastery AS (
    SELECT 
      q.subtopic_id,
      ROUND(AVG((uqs.box_number::float / 7) * 100))::integer as mastery
    FROM user_question_state uqs
    JOIN questions q ON q.id = uqs.question_id AND q.is_active = true
    WHERE uqs.user_id = _user_id
    GROUP BY q.subtopic_id
  )
  SELECT 
    s.id as subject_id,
    s.title as subject_name,
    COALESCE(AVG(um.mastery)::integer, 0) as subject_mastery,
    t.id as topic_id,
    t.title as topic_name,
    COALESCE(AVG(um.mastery) FILTER (WHERE st.topic_id = t.id)::integer, 0) as topic_mastery,
    st.id as subtopic_id,
    st.title as subtopic_name,
    COALESCE(um.mastery, 0) as subtopic_mastery
  FROM subjects s
  JOIN topics t ON t.subject_id = s.id
  JOIN subtopics st ON st.topic_id = t.id
  LEFT JOIN user_mastery um ON um.subtopic_id = st.id
  GROUP BY s.id, s.title, s.display_order, t.id, t.title, t.display_order, st.id, st.title, st.display_order, um.mastery
  ORDER BY s.display_order, t.display_order, st.display_order;
$$;

-- Admin function to update user subscription
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  _user_id uuid,
  _plan subscription_plan,
  _duration subscription_duration DEFAULT NULL,
  _expires_at timestamp with time zone DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit integer;
BEGIN
  -- Check admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;

  -- Set daily limit based on plan
  v_daily_limit := CASE _plan
    WHEN 'free' THEN 10
    ELSE 9999
  END;

  -- Upsert subscription
  INSERT INTO subscriptions (user_id, plan, duration, expires_at, daily_limit, is_active)
  VALUES (_user_id, _plan, _duration, _expires_at, v_daily_limit, true)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan = _plan,
    duration = _duration,
    expires_at = _expires_at,
    daily_limit = v_daily_limit,
    is_active = true,
    updated_at = now();

  RETURN true;
END;
$$;