-- Question reports table for users to flag problematic questions
CREATE TABLE public.question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_question_reports_question ON public.question_reports(question_id);

-- Enable RLS
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports (one per question)
CREATE POLICY "Users can insert own reports"
ON public.question_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own reports
CREATE POLICY "Users can read own reports"
ON public.question_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all reports
CREATE POLICY "Admins can read all reports"
ON public.question_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete reports (after resolving)
CREATE POLICY "Admins can delete reports"
ON public.question_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
