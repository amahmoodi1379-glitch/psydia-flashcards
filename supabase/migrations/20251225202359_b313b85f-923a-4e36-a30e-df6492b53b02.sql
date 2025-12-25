-- =============================================
-- 1. CONTENT HIERARCHY TABLES
-- =============================================

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subtopics table
CREATE TABLE public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  stem_text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 2. USER DATA
-- =============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  telegram_id TEXT UNIQUE,
  avatar_url TEXT,
  theme_preference TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. LEITNER SYSTEM TABLES
-- =============================================

-- User question state (Leitner box system)
CREATE TABLE public.user_question_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  box_number INT NOT NULL DEFAULT 1 CHECK (box_number >= 1 AND box_number <= 5),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  interval_days INT NOT NULL DEFAULT 1,
  ease_factor FLOAT NOT NULL DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Attempt logs
CREATE TABLE public.attempt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_index INT,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. INDEXES
-- =============================================

CREATE INDEX idx_topics_subject ON public.topics(subject_id);
CREATE INDEX idx_subtopics_topic ON public.subtopics(topic_id);
CREATE INDEX idx_questions_subtopic ON public.questions(subtopic_id);
CREATE INDEX idx_questions_active ON public.questions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_question_state_user ON public.user_question_state(user_id);
CREATE INDEX idx_user_question_state_review ON public.user_question_state(user_id, next_review_at);
CREATE INDEX idx_attempt_logs_user ON public.attempt_logs(user_id);
CREATE INDEX idx_attempt_logs_created ON public.attempt_logs(user_id, created_at);

-- =============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES - Content Tables (Public Read)
-- =============================================

-- Subjects: public read
CREATE POLICY "Anyone can read subjects"
  ON public.subjects FOR SELECT
  USING (true);

-- Topics: public read
CREATE POLICY "Anyone can read topics"
  ON public.topics FOR SELECT
  USING (true);

-- Subtopics: public read
CREATE POLICY "Anyone can read subtopics"
  ON public.subtopics FOR SELECT
  USING (true);

-- Questions: public read (only active)
CREATE POLICY "Anyone can read active questions"
  ON public.questions FOR SELECT
  USING (is_active = true);

-- =============================================
-- 7. RLS POLICIES - User Data (Own Data Only)
-- =============================================

-- Profiles: users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Profiles: users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Profiles: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User question state: users can read their own
CREATE POLICY "Users can read own question state"
  ON public.user_question_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User question state: users can insert their own
CREATE POLICY "Users can insert own question state"
  ON public.user_question_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User question state: users can update their own
CREATE POLICY "Users can update own question state"
  ON public.user_question_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Attempt logs: users can read their own
CREATE POLICY "Users can read own attempt logs"
  ON public.attempt_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Attempt logs: users can insert their own
CREATE POLICY "Users can insert own attempt logs"
  ON public.attempt_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. TRIGGER FOR AUTO-CREATE PROFILE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'کاربر'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 9. UPDATE TIMESTAMP TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_question_state_updated_at
  BEFORE UPDATE ON public.user_question_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 10. INSERT DUMMY PERSIAN DATA
-- =============================================

-- Insert subject
INSERT INTO public.subjects (id, title, display_order) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'روان‌شناسی عمومی', 1);

-- Insert topic
INSERT INTO public.topics (id, subject_id, title, display_order) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'حافظه و یادگیری', 1);

-- Insert subtopic
INSERT INTO public.subtopics (id, topic_id, title, display_order) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'انواع حافظه', 1);

-- Insert 5 questions
INSERT INTO public.questions (subtopic_id, stem_text, choices, correct_index, explanation) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012',
   'کدام نوع حافظه برای نگهداری اطلاعات به مدت طولانی استفاده می‌شود؟',
   '["حافظه حسی", "حافظه کوتاه‌مدت", "حافظه بلندمدت", "حافظه کاری"]'::jsonb,
   2,
   'حافظه بلندمدت برای ذخیره اطلاعات به مدت نامحدود استفاده می‌شود و ظرفیت آن نامحدود است.'),
  
  ('c3d4e5f6-a7b8-9012-cdef-123456789012',
   'ظرفیت حافظه کوتاه‌مدت چند آیتم است؟',
   '["۳ تا ۵", "۷ مثبت یا منفی ۲", "۱۰ تا ۱۲", "نامحدود"]'::jsonb,
   1,
   'طبق تحقیقات جورج میلر، ظرفیت حافظه کوتاه‌مدت ۷±۲ آیتم است که به «عدد جادویی میلر» معروف است.'),
  
  ('c3d4e5f6-a7b8-9012-cdef-123456789012',
   'کدام یک از موارد زیر مثالی از «رمزگذاری معنایی» است؟',
   '["به خاطر سپردن شکل یک کلمه", "به خاطر سپردن صدای یک کلمه", "به خاطر سپردن معنای یک کلمه", "به خاطر سپردن رنگ یک کلمه"]'::jsonb,
   2,
   'رمزگذاری معنایی به پردازش اطلاعات بر اساس معنا و مفهوم آن‌ها اشاره دارد و عمیق‌ترین سطح پردازش است.'),
  
  ('c3d4e5f6-a7b8-9012-cdef-123456789012',
   'پدیده «نوک زبان» مربوط به کدام نوع فراموشی است؟',
   '["فراموشی پس‌گستر", "فراموشی پیش‌گستر", "ناتوانی در بازیابی", "زوال حافظه"]'::jsonb,
   2,
   'پدیده نوک زبان زمانی رخ می‌دهد که اطلاعات در حافظه وجود دارد اما فرد موقتاً قادر به بازیابی آن نیست.'),
  
  ('c3d4e5f6-a7b8-9012-cdef-123456789012',
   'کدام ساختار مغزی نقش کلیدی در تبدیل حافظه کوتاه‌مدت به بلندمدت دارد؟',
   '["آمیگدال", "هیپوکامپ", "مخچه", "تالاموس"]'::jsonb,
   1,
   'هیپوکامپ نقش حیاتی در تثبیت حافظه و انتقال اطلاعات از حافظه کوتاه‌مدت به بلندمدت دارد.');