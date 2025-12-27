-- Drop the view with security definer and recreate without it
DROP VIEW IF EXISTS public.questions_safe;

-- Recreate as a simple view (inherits caller's permissions)
CREATE VIEW public.questions_safe AS
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

-- Grant access
GRANT SELECT ON public.questions_safe TO authenticated;
GRANT SELECT ON public.questions_safe TO anon;