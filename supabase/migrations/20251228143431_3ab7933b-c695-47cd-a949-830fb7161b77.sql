-- Phase 1: Add indexes for performance optimization

-- Index for frequently wrong questions query (user_id + question_id + is_correct)
CREATE INDEX IF NOT EXISTS idx_attempt_logs_user_question ON attempt_logs (user_id, question_id);

-- Index for filtering wrong answers
CREATE INDEX IF NOT EXISTS idx_attempt_logs_wrong ON attempt_logs (user_id, is_correct) WHERE is_correct = false;

-- Index for date-based queries (activity charts, cleanup)
CREATE INDEX IF NOT EXISTS idx_attempt_logs_created_at ON attempt_logs (user_id, created_at);

-- Index for daily usage cleanup
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage (usage_date);

-- Phase 1: Add Foreign Keys with ON DELETE CASCADE

-- attempt_logs -> profiles
ALTER TABLE attempt_logs 
DROP CONSTRAINT IF EXISTS attempt_logs_user_id_fkey;
ALTER TABLE attempt_logs 
ADD CONSTRAINT attempt_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- attempt_logs -> questions
ALTER TABLE attempt_logs 
DROP CONSTRAINT IF EXISTS attempt_logs_question_id_fkey;
ALTER TABLE attempt_logs 
ADD CONSTRAINT attempt_logs_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- bookmarks -> profiles
ALTER TABLE bookmarks 
DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- bookmarks -> questions
ALTER TABLE bookmarks 
DROP CONSTRAINT IF EXISTS bookmarks_question_id_fkey;
ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- user_question_state -> profiles
ALTER TABLE user_question_state 
DROP CONSTRAINT IF EXISTS user_question_state_user_id_fkey;
ALTER TABLE user_question_state 
ADD CONSTRAINT user_question_state_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- user_question_state -> questions
ALTER TABLE user_question_state 
DROP CONSTRAINT IF EXISTS user_question_state_question_id_fkey;
ALTER TABLE user_question_state 
ADD CONSTRAINT user_question_state_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- subscriptions -> profiles
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- payment_logs -> profiles
ALTER TABLE payment_logs 
DROP CONSTRAINT IF EXISTS payment_logs_user_id_fkey;
ALTER TABLE payment_logs 
ADD CONSTRAINT payment_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- daily_usage -> profiles
ALTER TABLE daily_usage 
DROP CONSTRAINT IF EXISTS daily_usage_user_id_fkey;
ALTER TABLE daily_usage 
ADD CONSTRAINT daily_usage_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix questions_safe view: Add RLS policy or recreate as secure view
DROP VIEW IF EXISTS questions_safe;
CREATE VIEW questions_safe WITH (security_invoker = true) AS
SELECT 
  id,
  stem_text,
  choices,
  explanation,
  subtopic_id,
  is_active,
  created_at
FROM questions
WHERE is_active = true;