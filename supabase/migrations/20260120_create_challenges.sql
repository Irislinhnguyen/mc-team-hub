-- =====================================================
-- Monthly Challenge Feature - Database Schema
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USER_TEAM_ASSIGNMENTS TABLE
-- Link users to teams for leader grading functionality
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_team UNIQUE(user_id, team_id)
);

-- Index for user_team_assignments
CREATE INDEX idx_user_team_assignments_user ON public.user_team_assignments(user_id);
CREATE INDEX idx_user_team_assignments_team ON public.user_team_assignments(team_id);
CREATE INDEX idx_user_team_assignments_leader ON public.user_team_assignments(team_id, role)
  WHERE role = 'leader';

-- =====================================================
-- 2. CHALLENGES TABLE
-- Main challenge entity
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,

  -- Timing
  open_date TIMESTAMPTZ NOT NULL,
  close_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,

  -- Attempts
  max_attempts INTEGER NOT NULL DEFAULT 1,

  -- Status workflow: draft -> scheduled -> open -> closed -> grading -> completed
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- Being created, questions not finalized
    'scheduled',  -- Scheduled to open
    'open',       -- Accepting submissions
    'closed',     -- No longer accepting submissions
    'grading',    -- Manual grading in progress
    'completed'   -- Grading done, leaderboard published
  )),

  -- Leaderboard
  leaderboard_published_at TIMESTAMPTZ,
  leaderboard_published_by UUID REFERENCES public.users(id),

  -- Ownership
  created_by UUID NOT NULL REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (close_date > open_date),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_attempts CHECK (max_attempts > 0)
);

-- Indexes for challenges
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_challenges_dates ON public.challenges(open_date, close_date);
CREATE INDEX idx_challenges_created_by ON public.challenges(created_by);

-- =====================================================
-- 3. CHALLENGE_QUESTIONS TABLE
-- Questions for each challenge
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,

  -- Question Content
  question_type TEXT NOT NULL CHECK (question_type IN ('essay', 'cloze', 'drag_drop')),
  question_text TEXT NOT NULL,

  -- For cloze: Moodle format "The capital of {1:France} is Paris"
  -- For drag-drop: JSON configuration of draggable items and drop zones
  -- For essay: NULL or hints
  options JSONB,
  correct_answer JSONB,

  -- Points
  points INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Optional image/media reference
  media_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_question_order UNIQUE (challenge_id, display_order),
  CONSTRAINT valid_points CHECK (points > 0)
);

-- Indexes for challenge_questions
CREATE INDEX idx_challenge_questions_challenge ON public.challenge_questions(challenge_id, display_order);
CREATE INDEX idx_challenge_questions_type ON public.challenge_questions(question_type);

-- =====================================================
-- 4. CHALLENGE_SUBMISSIONS TABLE
-- User attempts for each challenge
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Attempt tracking
  attempt_number INTEGER NOT NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  -- Auto-graded score (immediate feedback, excluding essays)
  auto_score NUMERIC(5,2),
  auto_score_max INTEGER,

  -- Final score (after manual grading)
  final_score NUMERIC(5,2),
  final_score_max INTEGER,

  -- Status: in_progress -> submitted -> graded -> published
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'submitted',
    'graded',
    'published'
  )),

  -- Team info (denormalized for efficient leader filtering)
  user_team_id TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_attempt UNIQUE (challenge_id, user_id, attempt_number),
  CONSTRAINT valid_time_spent CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0),
  CONSTRAINT valid_auto_score CHECK (auto_score IS NULL OR (auto_score >= 0 AND auto_score <= auto_score_max)),
  CONSTRAINT valid_final_score CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= final_score_max))
);

-- Indexes for challenge_submissions
CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_user ON public.challenge_submissions(user_id);
CREATE INDEX idx_challenge_submissions_status ON public.challenge_submissions(status);
CREATE INDEX idx_challenge_submissions_team ON public.challenge_submissions(user_team_id)
  WHERE user_team_id IS NOT NULL;
CREATE INDEX idx_challenge_submissions_leaderboard ON public.challenge_submissions(challenge_id, final_score DESC NULLS LAST)
  WHERE status = 'published';

-- =====================================================
-- 5. CHALLENGE_ANSWERS TABLE
-- Individual question answers with grading
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.challenge_questions(id) ON DELETE CASCADE,

  -- User's answer
  answer_text TEXT,              -- For essay and cloze questions
  answer_data JSONB,             -- For drag-drop questions (placements)
  answer_order TEXT[],           -- For drag-drop: order of item IDs

  -- Auto-grading result
  is_auto_graded BOOLEAN DEFAULT FALSE,
  auto_score NUMERIC(5,2),
  auto_feedback TEXT,

  -- Manual grading (for essays)
  manual_score NUMERIC(5,2),
  manual_feedback TEXT,
  graded_by UUID REFERENCES public.users(id),
  graded_at TIMESTAMPTZ,

  -- Manager override tracking
  grading_modified_by UUID REFERENCES public.users(id),
  grading_modified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_answer UNIQUE (submission_id, question_id),
  CONSTRAINT valid_auto_score CHECK (auto_score IS NULL OR auto_score >= 0),
  CONSTRAINT valid_manual_score CHECK (manual_score IS NULL OR manual_score >= 0)
);

-- Indexes for challenge_answers
CREATE INDEX idx_challenge_answers_submission ON public.challenge_answers(submission_id);
CREATE INDEX idx_challenge_answers_question ON public.challenge_answers(question_id);
CREATE INDEX idx_challenge_answers_ungraded_essay ON public.challenge_answers(question_id, submission_id)
  WHERE is_auto_graded = FALSE AND manual_score IS NULL;
CREATE INDEX idx_challenge_answers_graded_by ON public.challenge_answers(graded_by);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_answers ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- USER_TEAM_ASSIGNMENTS Policies
-- -----------------------------------------------------

-- All authenticated users can view their own team assignments
CREATE POLICY "Users can view own team assignments"
  ON public.user_team_assignments FOR SELECT
  USING (user_id = auth.uid());

-- Admin/Manager can view all team assignments
CREATE POLICY "Admin/Manager can view all team assignments"
  ON public.user_team_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Admin/Manager can manage team assignments
CREATE POLICY "Admin/Manager can manage team assignments"
  ON public.user_team_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- -----------------------------------------------------
-- CHALLENGES Policies
-- -----------------------------------------------------

-- Admin/Manager: Full access to all challenges
CREATE POLICY "Admin/Manager full access to challenges"
  ON public.challenges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Leader: Can view challenges for grading (closed/grading status)
CREATE POLICY "Leader can view challenges for grading"
  ON public.challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'leader'
    )
    AND status IN ('closed', 'grading', 'completed')
  );

-- All users: Can view open/published challenges
CREATE POLICY "Users can view open challenges"
  ON public.challenges FOR SELECT
  USING (status IN ('open', 'closed', 'grading', 'completed'));

-- -----------------------------------------------------
-- CHALLENGE_QUESTIONS Policies
-- -----------------------------------------------------

-- Admin/Manager: Full access to questions
CREATE POLICY "Admin/Manager full access to questions"
  ON public.challenge_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can view questions for open challenges
CREATE POLICY "Users can view questions for open challenges"
  ON public.challenge_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = challenge_questions.challenge_id
      AND status IN ('open', 'closed', 'grading', 'completed')
    )
  );

-- Leaders can view questions for grading
CREATE POLICY "Leaders can view questions for grading"
  ON public.challenge_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'leader'
    )
    AND EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = challenge_questions.challenge_id
      AND status IN ('closed', 'grading', 'completed')
    )
  );

-- -----------------------------------------------------
-- CHALLENGE_SUBMISSIONS Policies
-- -----------------------------------------------------

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.challenge_submissions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own submissions
CREATE POLICY "Users can create submissions"
  ON public.challenge_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own in-progress submissions
CREATE POLICY "Users can update own submissions"
  ON public.challenge_submissions FOR UPDATE
  USING (user_id = auth.uid() AND status = 'in_progress')
  WITH CHECK (user_id = auth.uid() AND status = 'in_progress');

-- Leaders can view their team's submissions
CREATE POLICY "Leaders can view team submissions"
  ON public.challenge_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'leader'
    )
    AND user_team_id IN (
      SELECT team_id FROM public.user_team_assignments
      WHERE user_id = auth.uid() AND role = 'leader'
    )
  );

-- Admin/Manager: Full access to all submissions
CREATE POLICY "Admin/Manager full access to submissions"
  ON public.challenge_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- -----------------------------------------------------
-- CHALLENGE_ANSWERS Policies
-- -----------------------------------------------------

-- Users can view their own answers
CREATE POLICY "Users can view own answers"
  ON public.challenge_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_submissions
      WHERE id = submission_id AND user_id = auth.uid()
    )
  );

-- Users can create/update their own answers (during active test)
CREATE POLICY "Users can create answers"
  ON public.challenge_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_submissions
      WHERE id = submission_id AND user_id = auth.uid() AND status = 'in_progress'
    )
  );

CREATE POLICY "Users can update own answers"
  ON public.challenge_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_submissions
      WHERE id = submission_id AND user_id = auth.uid() AND status = 'in_progress'
    )
  );

-- Leaders can grade essay answers for their team
CREATE POLICY "Leaders can grade team essays"
  ON public.challenge_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'leader'
    )
    AND EXISTS (
      SELECT 1 FROM public.challenge_submissions s
      JOIN public.user_team_assignments uta ON uta.team_id = s.user_team_id
      WHERE s.id = submission_id
      AND uta.user_id = auth.uid()
      AND uta.role = 'leader'
    )
    AND EXISTS (
      SELECT 1 FROM public.challenge_questions
      WHERE id = question_id AND question_type = 'essay'
    )
  )
  WITH CHECK (
    -- Can only set manual_score and manual_feedback
    manual_score IS NOT NULL
  );

-- Leaders can view answers for grading
CREATE POLICY "Leaders can view team answers for grading"
  ON public.challenge_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'leader'
    )
    AND EXISTS (
      SELECT 1 FROM public.challenge_submissions s
      JOIN public.user_team_assignments uta ON uta.team_id = s.user_team_id
      WHERE s.id = submission_id
      AND uta.user_id = auth.uid()
      AND uta.role = 'leader'
    )
  );

-- Admin/Manager: Full access to all answers (including grading override)
CREATE POLICY "Admin/Manager full access to answers"
  ON public.challenge_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's team ID
CREATE OR REPLACE FUNCTION get_user_team_id(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_team_id TEXT;
BEGIN
  SELECT team_id INTO v_team_id
  FROM public.user_team_assignments
  WHERE user_id = p_user_id
  LIMIT 1;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate and update submission score
CREATE OR REPLACE FUNCTION calculate_submission_score(p_submission_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_max INTEGER;
  v_has_ungraded_essay BOOLEAN;
BEGIN
  -- Calculate total score (prefer manual_score over auto_score)
  SELECT COALESCE(SUM(COALESCE(manual_score, auto_score, 0)), 0) INTO v_total
  FROM public.challenge_answers
  WHERE submission_id = p_submission_id;

  -- Calculate max possible score
  SELECT COALESCE(SUM(q.points), 0) INTO v_max
  FROM public.challenge_questions q
  JOIN public.challenge_answers a ON a.question_id = q.id
  WHERE a.submission_id = p_submission_id;

  -- Check if there are ungraded essay questions
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_answers a
    JOIN public.challenge_questions q ON q.id = a.question_id
    WHERE a.submission_id = p_submission_id
    AND q.question_type = 'essay'
    AND a.manual_score IS NULL
  ) INTO v_has_ungraded_essay;

  -- Update submission
  UPDATE public.challenge_submissions
  SET final_score = v_total,
      final_score_max = v_max,
      status = CASE
        WHEN v_has_ungraded_essay THEN 'submitted'
        ELSE 'graded'
      END,
      updated_at = NOW()
  WHERE id = p_submission_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-grade cloze and drag-drop answers
CREATE OR REPLACE FUNCTION auto_grade_answer(p_answer_id UUID)
RETURNS TABLE(is_correct BOOLEAN, score NUMERIC, feedback TEXT) AS $$
DECLARE
  v_question_type TEXT;
  v_options JSONB;
  v_correct_answer JSONB;
  v_answer_data JSONB;
  v_score NUMERIC;
  v_feedback TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- Get question and answer details
  SELECT
    q.question_type,
    q.options,
    q.correct_answer,
    a.answer_data
  INTO v_question_type, v_options, v_correct_answer, v_answer_data
  FROM public.challenge_answers a
  JOIN public.challenge_questions q ON q.id = a.question_id
  WHERE a.id = p_answer_id;

  -- Auto-grade based on question type
  IF v_question_type = 'cloze' THEN
    -- Cloze grading logic will be handled in application layer
    -- due to complexity of Moodle format
    v_is_correct := NULL;
    v_score := 0;
    v_feedback := 'Pending manual review';

  ELSIF v_question_type = 'drag_drop' THEN
    -- Drag-drop grading: check if all items in correct zones
    -- Application will handle detailed grading
    v_is_correct := NULL;
    v_score := 0;
    v_feedback := 'Pending auto-grading';

  ELSE
    -- Essay or other types requiring manual grading
    v_is_correct := NULL;
    v_score := NULL;
    v_feedback := NULL;
  END IF;

  -- Update the answer with auto-grading result
  UPDATE public.challenge_answers
  SET is_auto_graded = TRUE,
      auto_score = v_score,
      auto_feedback = v_feedback
  WHERE id = p_answer_id;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_user_team_assignments_updated_at
  BEFORE UPDATE ON public.user_team_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_questions_updated_at
  BEFORE UPDATE ON public.challenge_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_submissions_updated_at
  BEFORE UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_answers_updated_at
  BEFORE UPDATE ON public.challenge_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA (OPTIONAL)
-- =====================================================

-- Create a sample challenge for testing (optional, comment out in production)
-- INSERT INTO public.challenges (name, description, open_date, close_date, duration_minutes, max_attempts, status, created_by, updated_by)
-- VALUES (
--   'Sample Monthly Challenge',
--   'A sample challenge to test the system',
--   NOW() + INTERVAL '1 day',
--   NOW() + INTERVAL '7 days',
--   30,
--   1,
--   'draft',
--   (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1),
--   (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
-- );

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage on sequences (if any)
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant additional permissions as needed for RLS to work
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
