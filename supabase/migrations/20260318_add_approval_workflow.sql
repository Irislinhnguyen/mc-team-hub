-- =====================================================
-- Approval Workflow - Database Schema
-- =====================================================
-- Migration: Add approval workflow status and audit trail
-- Author: GSD Auto-Generated
-- Date: 2026-03-18
-- Purpose: Enable Leader -> Manager approval workflow for challenge grades
-- =====================================================

-- =====================================================
-- 1. EXTEND CHALLENGE_SUBMISSIONS STATUS
-- =====================================================
-- Add pending_review and approved states to the status CHECK constraint
-- Existing values: in_progress, submitted, graded, published
-- New values: pending_review, approved (inserted after 'graded')

-- Drop existing constraint
ALTER TABLE public.challenge_submissions
DROP CONSTRAINT IF EXISTS challenge_submissions_status_check;

-- Add new constraint with extended status values
ALTER TABLE public.challenge_submissions
ADD CONSTRAINT challenge_submissions_status_check
CHECK (status IN (
  'in_progress',     -- User is taking the challenge
  'submitted',       -- User has submitted, awaiting grading
  'grading',         -- Leader is currently grading
  'pending_review',  -- Leader has graded and submitted for Manager review (NEW)
  'approved',        -- Manager has reviewed, ready to publish (NEW)
  'published'        -- Scores are live on leaderboard
));

-- =====================================================
-- 2. CREATE APPROVALS TABLE
-- =====================================================
-- Audit trail for all approval workflow actions
-- Tracks Leader submissions for review and Manager approvals

CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to submission being approved
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,

  -- Who triggered this approval action
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_role TEXT NOT NULL CHECK (user_role IN ('leader', 'manager', 'admin')),

  -- Action type
  action TEXT NOT NULL CHECK (action IN (
    'submitted_for_review',  -- Leader submits graded submission for review
    'approved'               -- Manager approves submission for publishing
  )),

  -- Status transition context
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,

  -- Optional notes (for future use, e.g., rejection feedback)
  notes TEXT,

  -- Audit timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for filtering approvals by submission
CREATE INDEX idx_approvals_submission ON public.approvals(submission_id);

-- Index for filtering approvals by user
CREATE INDEX idx_approvals_user ON public.approvals(user_id);

-- Index for filtering approvals by action
CREATE INDEX idx_approvals_action ON public.approvals(action);

-- Composite index for pending submissions query
CREATE INDEX idx_approvals_pending_review ON public.challenge_submissions(status, updated_at DESC)
WHERE status = 'pending_review';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on approvals table
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read approvals (transparency)
CREATE POLICY "All users can read approvals"
  ON public.approvals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Leader/Manager/Admin can create approval records
CREATE POLICY "Leader/Manager/Admin can create approvals"
  ON public.approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('leader', 'manager', 'admin')
    )
  );

-- Policy: No delete policy (audit trail - no deletes allowed)
-- Intentionally omitted - approvals are permanent audit records

-- =====================================================
-- 5. UPDATE EXISTING RLS POLICIES FOR NEW STATUSES
-- =====================================================

-- Update challenge_submissions policy to include new statuses for leaders
-- Leaders can view submissions in pending_review status (they submitted)
DROP POLICY IF EXISTS "Leaders can view team submissions" ON public.challenge_submissions;

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

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration on Supabase (via Dashboard or CLI)
-- 2. Regenerate TypeScript types: npx supabase gen types typescript --project-id <ID> > apps/web/lib/supabase/database.types.ts
-- 3. Verify new types in database.types.ts
-- =====================================================
