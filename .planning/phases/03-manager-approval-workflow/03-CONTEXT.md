# Phase 3: Manager Approval Workflow - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a Leader → Manager review workflow for grading. Leaders submit grades for Manager review before publishing to leaderboard. Manager can review and edit grades, then Manager/Admin publishes. No rejection workflow — Manager just edits directly if changes needed.

**Key decision:** No approve/reject buttons. Manager reviews and can edit grades. When satisfied, Manager/Admin publishes to leaderboard.
</domain>

<decisions>
## Implementation Decisions

### 1. Approval State Model

**Status Workflow:** Add `pending_review` and `approved` states to submission status
- `in_progress` — User is taking the challenge
- `submitted` — User has submitted, awaiting grading
- `grading` — Leader is currently grading
- `pending_review` — Leader has graded and submitted for Manager review
- `approved` — Manager has reviewed, ready to publish
- `published` — Scores are live on leaderboard

**Existing Status Extension:** Add two new statuses to the existing CHECK constraint in `challenge_submissions` table

**Approval Table:** Create `approvals` table for audit trail
- Tracks when Leader submitted for review (status → `pending_review`)
- Tracks when Manager reviews (status → `approved`)
- Records who made the change and when

**No Separate Approval Status:** The submission status itself tracks approval stage. No additional `approval_status` field needed.

### 2. Leader Submit Flow (Flexible)

Leader can choose how to submit:
- **Submit one submission:** Each graded submission has a "Submit for Review" button
- **Submit all at once:** Bulk "Submit All for Review" button in grading interface
- **Mixed approach:** Leader can submit some individually, then submit remaining in bulk

**Submit Button Behavior:**
- Only appears when all essay questions in a submission are graded
- Button label: "Submit for Review"
- On click: Updates submission status to `pending_review`, creates approval record, triggers notification to Manager
- After submit: Button becomes "Submitted" (disabled), shows "Submitted at [time]"

**Leader Cannot Revoke:** Once submitted, Leader cannot unsubmit. Manager can edit if needed.

### 3. Manager Review UI (List + Detail with Next/Prev)

**Approval Queue Page:** Route at `/admin/approvals` or `/admin/challenges/[id]/approvals`
- **List view (primary):** Table showing all pending submissions (`status = 'pending_review'`)
  - Columns: Challenge name, Student name, Team, Submitted at, Graded by (Leader), Status
  - Click row to open detail view
  - Filter by challenge, team, leader

**Detail View:** Manager reviews one submission at a time
- **Navigation:** "Previous" and "Next" buttons to move between pending submissions
- **Content:**
  - Student info: Name, team, submission time
  - Leader info: Who graded, when submitted
  - All answers with grades (auto-graded + manual-graded essays)
  - Leader's feedback comments visible
- **Actions:**
  - **Edit grades:** Manager can change any grade
  - **Add feedback:** Manager can add/edit feedback comments
  - **Approve:** Button updates status to `approved`, creates approval record, notifies Leader
  - **Save changes:** Saves edits without approving (stays in `pending_review`)

**No Reject Button:** Manager doesn't reject — just edits grades directly if not satisfied.

### 4. Manager Edit Permissions

**What Manager Can Edit:**
- All `manual_score` values on essay answers
- All `manual_feedback` text
- Can add new feedback where missing
- Can modify Leader's grading (track via `grading_modified_by`, `grading_modified_at`)

**Edit Tracking:** The existing `challenge_answers` schema already has:
- `grading_modified_by` — UUID of user who last modified the grade
- `grading_modified_at` — Timestamp of last modification
Use these fields to track Manager edits.

**No "Revert to Leader" Needed:** Manager edits directly. If Leader had graded, Manager's changes override. Original Leader grade is not preserved (simplification).

### 5. Publishing (Manager/Admin Only)

**Who Can Publish:** Only Manager and Admin roles
- **Leader:** Cannot publish at all (no access)
- **Manager:** Can publish when status is `approved`
- **Admin:** Can publish when status is `approved`

**Publish API Validation:**
- Check user role is `manager` or `admin`
- Check submission status is `approved`
- If not approved: Return error "Grades must be approved before publishing"

**UI Behavior:**
- **Publish button only shows** for Manager/Admin
- **Button disabled** when status is not `approved`
- **Disabled state shows:** "Awaiting approval" message
- **After publish:** Status becomes `published`, sets `leaderboard_published_at`, notifies all users

**No Publish Warning:** Since button is disabled until approved, no confirmation dialog needed.

### 6. Notifications

**Manager Notification (Leader → Manager):**
- **Trigger:** When Leader submits submission for review (status → `pending_review`)
- **Recipients:** All Managers and Admins
- **Title:** "Grades Ready for Review"
- **Message:** "[Leader name] has graded [Student name]'s submission for [Challenge name]"
- **Action link:** Goes to approval detail view for that submission
- **Uses existing:** `notifyManagersGradesSubmitted()` from Phase 2

**Leader Notification (Manager → Leader):**
- **Trigger:** When Manager edits grades OR approves (status → `approved`)
- **Recipients:** The Leader who originally graded the submission
- **Title (edits):** "Grades Updated"
- **Message (edits):** "[Manager name] edited your grades for [Student name]'s submission"
- **Title (approve):** "Grades Approved"
- **Message (approve):** "[Manager name] approved your grading for [Challenge name]"
- **Uses existing:** `notifyLeadersGradeApproved()` from Phase 2 (already supports edit tracking via notes)

**User Notification (Publish → Users):**
- **Trigger:** When Manager/Admin publishes leaderboard
- **Recipients:** All users
- **Title:** "Scores Published"
- **Message:** "Scores for [Challenge name] are now available!"
- **Uses existing:** `notifyUsersScoresPublished()` from Phase 2

### 7. Database Schema Changes

**Migration: Add new statuses to `challenge_submissions`**

```sql
-- Add new statuses to the CHECK constraint
ALTER TABLE public.challenge_submissions
DROP CONSTRAINT IF EXISTS challenge_submissions_status_check;

ALTER TABLE public.challenge_submissions
ADD CONSTRAINT challenge_submissions_status_check
  CHECK (status IN (
    'in_progress',
    'submitted',
    'grading',
    'pending_review',  -- NEW: Leader submitted for Manager review
    'approved',        -- NEW: Manager reviewed and approved
    'published'
  ));
```

**New Table: `approvals`**

```sql
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,

  -- Who triggered this approval action
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_role TEXT NOT NULL CHECK (user_role IN ('leader', 'manager', 'admin')),

  -- Action type
  action TEXT NOT NULL CHECK (action IN ('submitted_for_review', 'approved')),

  -- Context
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,

  -- Notes (optional, for rejection feedback if we ever add it)
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_submission ON public.approvals(submission_id);
CREATE INDEX idx_approvals_user ON public.approvals(user_id);
CREATE INDEX idx_approvals_action ON public.approvals(action);
```

**RLS Policies for `approvals`:**
- Everyone can read approvals (transparency)
- Only Leader/Manager/Admin can create approval records
- No one can delete (audit trail)

### 8. API Endpoints

**Leader Submit for Review:**
- `POST /api/challenges/submissions/:id/submit-for-review`
- Auth: Leader or above
- Body: `{ submissionId: string }`
- Action: Updates status to `pending_review`, creates approval record, triggers notification
- Response: `{ success: true, approval: {...} }`

**Manager Edit Grades:**
- `PATCH /api/challenges/submissions/:id/grades`
- Auth: Manager or Admin only
- Body: `{ answers: [{ answerId, score, feedback }] }`
- Action: Updates grades, sets `grading_modified_by`, `grading_modified_at`
- Does NOT change approval status (stays `pending_review` until explicit approve)
- Response: `{ success: true, updated: count }`

**Manager Approve:**
- `POST /api/challenges/submissions/:id/approve`
- Auth: Manager or Admin only
- Body: `{ submissionId: string }`
- Action: Updates status to `approved`, creates approval record, triggers notification to Leader
- Response: `{ success: true, approval: {...} }`

**List Pending Approvals:**
- `GET /api/approvals/pending`
- Auth: Manager or Admin only
- Query: `?challengeId=xxx&teamId=xxx&leaderId=xxx`
- Response: `{ submissions: [...], total: number }`
- Returns submissions with `status = 'pending_review'`

**Approvals History (audit trail):**
- `GET /api/approvals/submission/:id`
- Auth: Manager or Admin only
- Response: `{ approvals: [...] }` — all approval actions for a submission

### 9. UI Components

**Leader Grading Page Updates:**
- Existing: `/admin/challenges/[id]/grading`
- Add: "Submit for Review" button per submission (when all essays graded)
- Add: "Submit All for Review" bulk button
- Add: Status badge showing `graded`, `pending_review`, `approved`, `published`

**Manager Approval Queue Page:**
- Route: `/admin/approvals` (new)
- Or: `/admin/challenges/[id]/approvals` (challenge-specific)
- Components:
  - `ApprovalQueueTable` — List of pending submissions
  - `ApprovalDetailView` — Single submission review with next/prev navigation
  - `GradeEditor` — Form for editing grades (reuses from grading interface)
  - `ApproveButton` — Approve action button

**Navigation:**
- Add "Approvals" link to AdminSidebar (Phase 1 component)
- Icon: Checkmark or clipboard
- Badge count: Number of pending approvals

### 10. Claude's Discretion

- Exact page route for approval queue (`/admin/approvals` vs `/admin/challenges/[id]/approvals`)
- Whether approval queue can be filtered by multiple criteria simultaneously
- Exact layout of approval detail view (sidebar vs top navigation)
- Animation/transition when clicking next/previous in review flow
- Whether to show "last modified" timestamp on edited grades
- Toast message wording after approve action

</decisions>

<specifics>
## Specific Ideas

- User wants flexible submit: Leader can submit individually OR in bulk — give both options
- User wants list + detail review UI: Manager sees list, clicks to review, has next/prev buttons
- User wants NO reject workflow: Manager just edits grades directly if not satisfied
- User wants Manager/Admin only to publish: Leader cannot publish at all
- User wants notifications both ways: Manager notified on submit, Leader notified on edit/approve
- User wants status names: "submitted, grading, graded" — but we're extending to add pending_review and approved
- Existing workflowNotificationService already has the functions we need — just call them at right times
- Existing `challenge_answers` schema has `grading_modified_by` and `grading_modified_at` — use these for edit tracking

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` §Phase 3 — Phase goal, requirements (APPR-01 to APPR-14), success criteria
- `.planning/REQUIREMENTS.md` §Phase 3 — Detailed requirements for approval workflow

### Prior phases (carry forward decisions)
- `.planning/phases/01-foundation-admin-unification/01-CONTEXT.md` — Admin structure, AdminSidebar route, AdminTable/Form/Dialog components
- `.planning/phases/02-notification-system/02-CONTEXT.md` — Notification system, workflowNotificationService functions

### Project context
- `.planning/PROJECT.md` — Core value, constraints, user roles
- `.planning/STATE.md` — Current progress, technical notes

### Codebase patterns
- `.planning/codebase/STRUCTURE.md` — Where to place new code
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import order, error handling
- `.planning/codebase/ARCHITECTURE.md` — Layers, data flow, context providers

### Database schema (existing)
- `supabase/migrations/20260120_create_challenges.sql` — Challenge tables, status workflow, RLS policies
- `apps/web/lib/supabase/database.types.ts` — TypeScript types for database tables

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AdminSidebar**: `components/admin/AdminSidebar.tsx` — Add "Approvals" navigation item here
- **AdminTable**: `components/admin/AdminTable.tsx` — Use for approval queue list
- **AdminForm**: `components/admin/AdminForm.tsx` — Use for grade editing form
- **Grading API**: `app/api/challenges/[id]/grading/route.ts` — Reference for grading patterns
- **Notification service**: `lib/services/workflowNotificationService.ts` — Has notifyManagersGradesSubmitted, notifyLeadersGradeApproved, notifyUsersScoresPublished

### Established Patterns
- **API routes**: `app/api/` with RESTful organization, auth checks via `getServerUser()`, role checks via `isLeaderOrAbove()`, `isAdminOrManager()`
- **Database migrations**: `supabase/migrations/` — Add new migration for status + approvals table
- **TypeScript types**: `lib/supabase/database.types.ts` — Regenerate after migration to get new types
- **Status enums**: String literals with CHECK constraints in Postgres
- **RLS policies**: Role-based access, admin/manager/leader hierarchy

### Integration Points
- **Grading UI**: `/admin/challenges/[id]/grading` — Add submit buttons here
- **Challenge status**: `challenges.status` field — Check if challenge is in grading phase
- **Submission status**: `challenge_submissions.status` field — Extend with new values
- **Notification bell**: Already in header (Phase 2) — Will show approval notifications
- **Auth context**: `app/contexts/AuthContext.tsx` — Get current user role for permissions

### What's Missing (to be built)
- Database: Add `pending_review`, `approved` to status CHECK constraint
- Database: Create `approvals` table with RLS policies
- API: POST /api/challenges/submissions/:id/submit-for-review
- API: PATCH /api/challenges/submissions/:id/grades (manager edit)
- API: POST /api/challenges/submissions/:id/approve
- API: GET /api/approvals/pending (list queue)
- API: GET /api/approvals/submission/:id (history)
- UI: Leader submit buttons in grading interface
- UI: Manager approval queue page (list + detail)
- UI: AdminSidebar "Approvals" navigation item
- Integration: Call notification triggers at status changes

</code_context>

<deferred>
## Deferred Ideas

- Leader "unsubmit" or "recall" functionality — Leader cannot revoke submit
- Rejection workflow with feedback — Manager edits directly instead
- Multiple approval levels (Manager → Admin) — Only Manager/Admin approves
- Bulk approve (approve multiple at once) — Individual approval only for now
- Approval comments/notes field — Not needed, Manager edits directly
- Approval delegation (Manager assigns approval to another Manager) — No delegation
- Approval SLA (time limits, escalation) — No time constraints
- Approval analytics (how long approvals take, rejection rates) — Phase 4 dashboard

</deferred>

---

*Phase: 03-manager-approval-workflow*
*Context gathered: 2026-03-18*
