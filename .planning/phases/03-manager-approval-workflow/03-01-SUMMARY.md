---
phase: 03-manager-approval-workflow
plan: 01
title: Database Schema for Approval Workflow
one-liner: "Approval workflow database schema: extended submission status enum with pending_review and approved states, created approvals audit trail table with RLS policies, and regenerated TypeScript types for type-safe implementation"
subsystem: Database Schema
tags: [database, migration, typescript, rls, approval-workflow]
dependencies:
  requires:
    - 03-00 (Test Infrastructure - provides E2E test suite)
  provides:
    - 03-02 (Leader Submit for Review API)
    - 03-03 (Manager Review UI)
    - 03-04 (Manager Edit Grades)
    - 03-05a (Manager Approve API)
    - 03-05b (Publish Workflow)
  affects:
    - apps/web/lib/supabase/database.types.ts (TypeScript types)
    - supabase/migrations (database schema)
tech-stack:
  added: []
  patterns:
    - Row Level Security (RLS) for approval actions
    - Audit trail pattern for workflow tracking
    - Status transition tracking
    - Role-based access control
key-files:
  created:
    - supabase/migrations/20260318_add_approval_workflow.sql (144 lines)
  modified:
    - apps/web/lib/subabase/database.types.ts (107 lines added)
key-decisions: []
metrics:
  duration: "5 minutes"
  tasks_completed: 3
  files_created: 1
  files_modified: 1
  completion_date: "2026-03-18"
---

# Phase 03 Plan 01: Database Schema for Approval Workflow Summary

**Status:** Complete
**Duration:** 5 minutes
**Tasks Completed:** 3/3

## Overview

Created database schema to support the Leader -> Manager -> Admin approval workflow for challenge submissions. Extended the submission status enum with `pending_review` and `approved` states, created an approvals audit trail table, and updated TypeScript types for type-safe implementation.

## Changes Made

### 1. Database Migration (Task 1)

**File:** `supabase/migrations/20260318_add_approval_workflow.sql`

**Schema Changes:**

1. **Extended challenge_submissions status CHECK constraint:**
   - Added `pending_review`: Leader has graded and submitted for Manager review
   - Added `approved`: Manager has reviewed, ready to publish
   - Full status flow: `in_progress` -> `submitted` -> `grading` -> `pending_review` -> `approved` -> `published`

2. **Created approvals audit table:**
   ```sql
   CREATE TABLE approvals (
     id UUID PRIMARY KEY,
     submission_id UUID REFERENCES challenge_submissions(id),
     user_id UUID REFERENCES users(id),
     user_role TEXT CHECK (user_role IN ('leader', 'manager', 'admin')),
     action TEXT CHECK (action IN ('submitted_for_review', 'approved')),
     from_status TEXT NOT NULL,
     to_status TEXT NOT NULL,
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   )
   ```

3. **Performance Indexes:**
   - `idx_approvals_submission` on submission_id
   - `idx_approvals_user` on user_id
   - `idx_approvals_action` on action
   - `idx_approvals_pending_review` on challenge_submissions(status, updated_at) WHERE status = 'pending_review'

4. **Row Level Security (RLS) Policies:**
   - "All users can read approvals" (transparency)
   - "Leader/Manager/Admin can create approvals" (role-based access)
   - No delete policy (audit trail must be permanent)

### 2. TypeScript Types (Task 2)

**File:** `apps/web/lib/supabase/database.types.ts`

**Added Types:**
- `approvals` table with Row, Insert, Update types
- Extended `challenge_submissions` status type with `'pending_review' | 'approved'`
- Helper types: `Approval`, `ApprovalInsert`, `ApprovalUpdate`
- Helper types: `ChallengeSubmission`, `ChallengeSubmissionInsert`, `ChallengeSubmissionUpdate`
- Type alias: `SubmissionStatus = ChallengeSubmission['status']`

### 3. Migration Applied (Task 3 - Checkpoint)

User confirmed migration applied to Supabase production database. Schema changes verified:
- Approvals table exists with proper constraints
- challenge_submissions status enum includes new values
- RLS policies enabled and functional

## Database Schema Verification

**Approvals Table Structure:**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() |
| submission_id | UUID | NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE |
| user_id | UUID | NOT NULL REFERENCES users(id) |
| user_role | TEXT | NOT NULL CHECK (IN ('leader', 'manager', 'admin')) |
| action | TEXT | NOT NULL CHECK (IN ('submitted_for_review', 'approved')) |
| from_status | TEXT | NOT NULL |
| to_status | TEXT | NOT NULL |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Status Transition Flow:**
```
Leader grades -> pending_review (creates approval: submitted_for_review)
Manager reviews -> approved (creates approval: approved)
Manager/Admin publishes -> published (updates submission status)
```

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates

None encountered during this plan.

## Success Criteria

- [x] Database migration file created with valid SQL
- [x] Migration successfully applied to Supabase (user confirmed)
- [x] TypeScript types regenerated with approval workflow types
- [x] Approvals table type structure matches migration schema
- [x] challenge_submissions status enum includes pending_review and approved

## Next Steps

1. **03-02: Leader Submit for Review API** - Implement API endpoint for Leaders to submit graded submissions for Manager review
2. **03-03: Manager Review UI** - Build UI component for Managers to review pending submissions
3. **03-04: Manager Edit Grades** - Allow Managers to edit grades before approval
4. **03-05a: Manager Approve API** - Implement approval endpoint for Managers
5. **03-05b: Publish Workflow** - Finalize publish functionality after approval

## Files Modified

- `supabase/migrations/20260318_add_approval_workflow.sql` (created, 144 lines)
- `apps/web/lib/supabase/database.types.ts` (modified, +107 lines)

## Commits

- `188296f`: feat(03-01): add approval workflow TypeScript types

## Integration Notes

The approval workflow schema is now in place. Next plans will:
- Use the `approvals` table to track workflow actions
- Transition submissions through `pending_review` -> `approved` -> `published` statuses
- Leverage RLS policies to enforce role-based access
- Reference the TypeScript types for type-safe database operations
