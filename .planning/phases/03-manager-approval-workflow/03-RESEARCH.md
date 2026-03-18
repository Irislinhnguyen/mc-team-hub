# Phase 3: Manager Approval Workflow - Research

**Researched:** 2026-03-18
**Domain:** Next.js 14, Supabase PostgreSQL, TypeScript approval workflow system
**Confidence:** HIGH

## Summary

This phase implements a Leader → Manager review workflow for grading before publishing to leaderboard. Leaders submit grades for Manager review, Manager can edit grades directly and approve, then Manager/Admin publishes to leaderboard. No rejection workflow — Manager edits grades directly if not satisfied.

The approval workflow extends the existing challenge submission status enum with two new states (`pending_review`, `approved`), creates an audit trail via a new `approvals` table, adds API endpoints for submission/approval operations, and builds Manager UI for review queue with list + detail navigation.

**Primary recommendation:** Use existing `challenge_submissions.status` field with extended CHECK constraint rather than separate `approval_status` field — simpler schema, easier queries, consistent with current codebase patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Approval State Model:** Add `pending_review` and `approved` states to `challenge_submissions.status` enum. Extend existing CHECK constraint, not a separate field.

2. **No Rejection Workflow:** Manager edits grades directly if not satisfied. No reject button or feedback notes field needed.

3. **Flexible Leader Submit:** Leader can submit individual graded submissions OR bulk "Submit All" — provide both options.

4. **Leader Cannot Revoke:** Once submitted, Leader cannot unsubmit. Manager can edit if needed.

5. **Manager/Admin Only Publish:** Only Manager and Admin roles can publish to leaderboard. Leader cannot publish at all.

6. **Publish Validation:** Publish button only enabled when status is `approved`. API validates role and status before publishing.

7. **Notifications Both Ways:**
   - Leader → Manager: "Grades Ready for Review" when Leader submits
   - Manager → Leader: "Grades Updated" when Manager edits, "Grades Approved" when Manager approves

8. **Approvals Audit Table:** New `approvals` table tracks who did what when (submitted_for_review, approved actions).

9. **Manager Edit Permissions:** Manager can edit all `manual_score` and `manual_feedback` values. Use existing `grading_modified_by` and `grading_modified_at` fields for edit tracking.

### Claude's Discretion

1. **Exact page route:** `/admin/approvals` vs `/admin/challenges/[id]/approvals`
2. **Multi-criteria filtering:** Whether approval queue can filter by challenge + team + leader simultaneously
3. **Detail view layout:** Sidebar navigation vs top navigation for approval detail view
4. **Next/Prev animations:** Transition effects when clicking next/previous in review flow
5. **"Last modified" timestamp:** Whether to show when Manager edited grades
6. **Toast message wording:** Exact text after approve action

### Deferred Ideas (OUT OF SCOPE)

1. Leader "unsubmit" or "recall" functionality
2. Rejection workflow with feedback
3. Multiple approval levels (Manager → Admin)
4. Bulk approve (approve multiple at once)
5. Approval comments/notes field
6. Approval delegation
7. Approval SLA (time limits, escalation)
8. Approval analytics

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APPR-01 | `approval_status` field on challenge_submissions | **DECISION CHANGED:** Use `status` field with extended enum instead (pending_review, approved) |
| APPR-02 | `approvals` table for audit trail | New table structure designed with RLS policies |
| APPR-03 | `approval_notes` field for manager feedback | **NOT NEEDED:** No rejection workflow, Manager edits directly |
| APPR-04 | API endpoint for Leader to submit grades for approval | POST /api/challenges/submissions/:id/submit-for-review |
| APPR-05 | API endpoint for Manager to approve grades | POST /api/challenges/submissions/:id/approve |
| APPR-06 | API endpoint for Manager to reject grades with notes | **NOT NEEDED:** No rejection workflow |
| APPR-07 | API endpoint to list pending approvals | GET /api/approvals/pending |
| APPR-08 | Leader UI: "Submit for Approval" button in grading interface | Add to existing grading page components |
| APPR-09 | Manager UI: Approval queue showing pending submissions | New approval queue page with table + detail |
| APPR-10 | Manager UI: Review submission with grades displayed | Detail view with all answers, Leader's feedback, edit capability |
| APPR-11 | Manager UI: Approve/Reject buttons with notes field | **NOT NEEDED:** No rejection, just Approve button + Save Changes |
| APPR-12 | Leaderboard publishing blocked until Manager approval | Publish API checks status === 'approved' |
| APPR-13 | Audit trail for all approval actions | `approvals` table with user_id, action, from_status, to_status, created_at |
| APPR-14 | Notification sent to Leader on Manager approval/rejection | **REJECT NOT NEEDED:** Notify on approve and on edit |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x | App Router API routes | Already in use, RESTful patterns established |
| Supabase | latest | Database (PostgreSQL), RLS | Existing database infrastructure, auth integration |
| TypeScript | 5.x | Type safety | Already configured, prevents schema errors |
| React | 18.x | UI components | Existing React patterns, hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI | latest | UI primitives (Dialog, Table, etc.) | Approval detail view modals, queue table |
| TanStack Query | latest | Data fetching for approval queue | Existing pattern in grading interface |
| Lucide React | latest | Icons (Checkmark, Clipboard, etc.) | Navigation icons, status badges |
| workflowNotificationService | existing | Notification triggers | Already has needed functions from Phase 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| status enum extension | Separate approval_status field | Simpler queries, consistent with existing pattern |
| approvals table | Foreign key on submissions | Audit trail needs all history, not just current state |

**Installation:**
```bash
# No new packages needed - all libraries already installed
# Database migration only
```

**Version verification:** All packages already in use from Phase 1 and Phase 2.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── api/
│   │   ├── approvals/
│   │   │   ├── pending/
│   │   │   │   └── route.ts          # GET pending approvals queue
│   │   │   └── submission/
│   │   │       └── [id]/
│   │   │           └── route.ts      # GET approval history for submission
│   │   └── challenges/
│   │       └── submissions/
│   │           └── [id]/
│   │               ├── submit-for-review/
│   │               │   └── route.ts  # POST Leader submits for review
│   │               ├── approve/
│   │               │   └── route.ts  # POST Manager approves
│   │               └── grades/
│   │                   └── route.ts  # PATCH Manager edits grades
│   └── (protected)/
│       └── admin/
│           └── approvals/
│               ├── page.tsx          # Approval queue page (list view)
│               └── [submissionId]/
│                   └── page.tsx      # Approval detail view (review + edit + approve)
├── app/
│   └── components/
│       └── admin/
│           ├── approvals/            # NEW: Approval-specific components
│           │   ├── ApprovalQueueTable.tsx
│           │   ├── ApprovalDetailView.tsx
│           │   ├── GradeEditor.tsx
│           │   └── ApproveButton.tsx
│           └── ...
├── lib/
│   └── services/
│       └── approvalService.ts        # NEW: Approval business logic
└── supabase/
    └── migrations/
        └── 20260318_add_approval_workflow.sql
```

### Pattern 1: Status Workflow with Audit Trail
**What:** Extend submission status enum and track all transitions in approvals table
**When to use:** Any state transition that needs audit trail (pending_review → approved → published)
**Example:**
```typescript
// Source: Existing challenge_submissions.status pattern
type SubmissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'grading'
  | 'pending_review'  // NEW
  | 'approved'        // NEW
  | 'published'

// Audit record creation
const { data: approval } = await supabase
  .from('approvals')
  .insert({
    submission_id: submissionId,
    user_id: user.sub,
    user_role: user.role,
    action: 'submitted_for_review',
    from_status: 'grading',
    to_status: 'pending_review',
    created_at: new Date().toISOString()
  })
  .select()
  .single()
```

### Pattern 2: Role-Based API Authorization
**What:** Use existing auth helpers for role checks
**When to use:** All API endpoints with role restrictions
**Example:**
```typescript
// Source: packages/auth/server.ts
import { getServerUser, isLeaderOrAbove, isAdminOrManager } from '@query-stream-ai/auth/server'

// Leader submit endpoint
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isLeaderOrAbove(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... submit logic
}

// Manager approve endpoint
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdminOrManager(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... approve logic
}
```

### Pattern 3: Notification Integration
**What:** Trigger workflow notifications at status transitions
**When to use:** After any approval action (submit, edit, approve)
**Example:**
```typescript
// Source: apps/web/lib/services/workflowNotificationService.ts
import {
  notifyManagersGradesSubmitted,
  notifyLeadersGradeApproved
} from '@/lib/services/workflowNotificationService'

// On Leader submit
await notifyManagersGradesSubmitted(
  challengeId,
  challengeName,
  user.name || 'A Leader',
  1 // submission count
)

// On Manager approve
await notifyLeadersGradeApproved(
  challengeId,
  challengeName,
  true, // approved = true
  undefined // no notes needed for approve
)
```

### Anti-Patterns to Avoid
- **Separate approval_status field:** Don't add when existing status field works — complicates queries, breaks existing code
- **Rejection workflow:** Don't build reject button/notes — Manager edits directly per requirements
- **Leader publish access:** Don't give Leaders any publish capability — Manager/Admin only
- **Hardcoded role checks:** Don't repeat role logic — use existing auth helpers

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin table component | Custom approval queue table | AdminTable from Phase 1 | Already has row click, columns pattern |
| Form dialogs | Custom modals for approval | AdminDialog from Phase 1 | Consistent UI patterns |
| Role checking | Inline role checks | @query-stream-ai/auth/server helpers | Single source of truth, tested |
| Notification service | Custom notification logic | workflowNotificationService from Phase 2 | Email + in-app already wired |
| Status badges | Custom status display | Badge from Radix UI | Consistent with existing admin UI |
| Grade editing | Custom grade form | Reuse grading form components | Essay grading already implemented |

**Key insight:** All UI components needed already exist from Phase 1 (AdminTable, AdminDialog) and Phase 2 (notification system). Focus on wiring them together for approval workflow, not building new UI primitives.

## Common Pitfalls

### Pitfall 1: Race Conditions on Status Update
**What goes wrong:** Two users update submission status simultaneously, last write wins
**Why it happens:** No locking on submission status transitions
**How to avoid:** Use transaction or check current status before update
```typescript
// Check current status before updating
const { data: submission } = await supabase
  .from('challenge_submissions')
  .select('status')
  .eq('id', submissionId)
  .single()

if (submission.status !== 'grading') {
  return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
}

// Update with where clause
await supabase
  .from('challenge_submissions')
  .update({ status: 'pending_review' })
  .eq('id', submissionId)
  .eq('status', 'grading') // Only update if still grading
```

### Pitfall 2: Missing Audit Records
**What goes wrong:** Status updates succeed but approval record fails silently
**Why it happens:** No transaction between status update and audit insert
**How to avoid:** Always create approval record, log errors, use Supabase RPC if needed
**Warning signs:** Audit trail missing entries for some submissions

### Pitfall 3: Leader Can Edit After Submit
**What goes wrong:** Leader modifies grades after Manager reviews
**Why it happens:** No role check on grade edit endpoint
**How to avoid:** Check role AND submission status before allowing edit
```typescript
// Leader cannot edit if submitted for review
if (user.role === 'leader' && submission.status === 'pending_review') {
  return NextResponse.json({ error: 'Cannot edit submitted submission' }, { status: 403 })
}
```

### Pitfall 4: Publish Before Approve
**What goes wrong:** Leader publishes grades without Manager approval
**Why it happens:** Publish API doesn't check approval status
**How to avoid:** Validate status === 'approved' AND role in ['manager', 'admin']
```typescript
if (submission.status !== 'approved') {
  return NextResponse.json({
    error: 'Grades must be approved before publishing'
  }, { status: 400 })
}

if (!isAdminOrManager(user)) {
  return NextResponse.json({
    error: 'Only Manager or Admin can publish'
  }, { status: 403 })
}
```

### Pitfall 5: Notification Spam
**What goes wrong:** Every grade edit sends notification to Leader
**Why it happens:** No debouncing on Manager edit action
**How to avoid:** Send notification only on explicit approve action, not every save
**Warning signs:** Leaders receive excessive edit notifications

## Code Examples

Verified patterns from existing codebase:

### Database Migration Pattern
```sql
-- Source: supabase/migrations/20260120_create_challenges.sql
-- Add new statuses to CHECK constraint
ALTER TABLE public.challenge_submissions
DROP CONSTRAINT IF EXISTS challenge_submissions_status_check;

ALTER TABLE public.challenge_submissions
ADD CONSTRAINT challenge_submissions_status_check
  CHECK (status IN (
    'in_progress',
    'submitted',
    'grading',
    'pending_review',  -- NEW
    'approved',        -- NEW
    'published'
  ));

-- Create approvals table
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_role TEXT NOT NULL CHECK (user_role IN ('leader', 'manager', 'admin')),
  action TEXT NOT NULL CHECK (action IN ('submitted_for_review', 'approved')),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_submission ON public.approvals(submission_id);
CREATE INDEX idx_approvals_user ON public.approvals(user_id);
CREATE INDEX idx_approvals_action ON public.approvals(action);
```

### API Route with Auth Check
```typescript
// Source: apps/web/app/api/challenges/[id]/grading/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isLeaderOrAbove, isAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isLeaderOrAbove(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const body = await request.json()

  // ... processing logic
  return NextResponse.json({ success: true })
}
```

### RLS Policy Pattern
```sql
-- Source: supabase/migrations/20260120_create_challenges.sql
-- Manager/Admin full access
CREATE POLICY "Admin/Manager full access to submissions"
  ON public.challenge_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
```

### AdminTable Component Usage
```typescript
// Source: apps/web/app/components/admin/AdminTable.tsx
import { AdminTable } from '@/app/components/admin/AdminTable'

const columns: Column<ApprovalSubmission>[] = [
  { key: 'student', header: 'Student', render: (row) => row.user_name },
  { key: 'team', header: 'Team', render: (row) => row.team_id },
  { key: 'status', header: 'Status', render: (row) => row.status },
]

<AdminTable
  data={approvals}
  columns={columns}
  onRowClick={(row) => router.push(`/admin/approvals/${row.id}`)}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Status enum per feature | Extended submission status enum | This phase | Simpler schema, easier queries |
| Inline permission checks | Centralized auth helpers | Phase 1 | Consistent role checks across codebase |
| No notification system | workflowNotificationService | Phase 2 | Email + in-app notifications ready |
| Duplicate admin apps | Unified admin under /admin | Phase 1 | Single source of truth for admin UI |

**Deprecated/outdated:**
- Separate approval status fields: Status enum extension is cleaner
- Rejection workflow patterns: Direct edit is simpler
- Leader publish access: Manager/Admin only per requirements

## Open Questions

1. **Route structure for approval queue**
   - What we know: Needs list view + detail view
   - What's unclear: Whether `/admin/approvals` or `/admin/challenges/[id]/approvals`
   - Recommendation: Start with `/admin/approvals` for cross-challenge view, add challenge-specific later if needed

2. **Filter granularity**
   - What we know: Need to filter by challenge, team, leader
   - What's unclear: Whether to support multi-filter simultaneously (challenge + team + leader)
   - Recommendation: Support all combinations using URL query params

3. **Detail view navigation UX**
   - What we know: Need Previous/Next buttons in detail view
   - What's unclear: Exact placement (sidebar vs top) and transition animations
   - Recommendation: Top navigation with simple page transition, evaluate animations later

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `apps/web/playwright.config.ts` |
| Quick run command | `npm test -- tests/approvals.spec.ts -g "should submit for approval"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPR-01 | Submission status tracking | e2e | `npm test -- tests/approvals.spec.ts -g "should track submission status"` | ❌ Wave 0 |
| APPR-02 | Approvals audit trail | e2e | `npm test -- tests/approvals.spec.ts -g "should create approval record"` | ❌ Wave 0 |
| APPR-04 | Leader submit for review | e2e | `npm test -- tests/approvals.spec.ts -g "should submit grades for review"` | ❌ Wave 0 |
| APPR-05 | Manager approve submission | e2e | `npm test -- tests/approvals.spec.ts -g "should approve submission"` | ❌ Wave 0 |
| APPR-07 | List pending approvals | e2e | `npm test -- tests/approvals.spec.ts -g "should show pending approvals"` | ❌ Wave 0 |
| APPR-08 | Leader submit button visible | e2e | `npm test -- tests/approvals.spec.ts -g "should show submit button"` | ❌ Wave 0 |
| APPR-09 | Manager approval queue | e2e | `npm test -- tests/approvals.spec.ts -g "should load approval queue"` | ❌ Wave 0 |
| APPR-10 | Manager review detail view | e2e | `npm test -- tests/approvals.spec.ts -g "should show submission details"` | ❌ Wave 0 |
| APPR-12 | Publish requires approval | e2e | `npm test -- tests/approvals.spec.ts -g "should block publish without approval"` | ❌ Wave 0 |
| APPR-13 | Audit trail accuracy | e2e | `npm test -- tests/approvals.spec.ts -g "should track all approval actions"` | ❌ Wave 0 |
| APPR-14 | Notifications on approval | e2e | `npm test -- tests/approvals.spec.ts -g "should send approval notifications"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run quick smoke test for modified endpoints (`npm test -- tests/approvals.spec.ts -g "should submit"`)
- **Per wave merge:** Full approval test suite (`npm test`)
- **Phase gate:** Full test suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/approvals.spec.ts` — Complete E2E test suite for approval workflow
- [ ] `tests/auth/setup-admin-approver.ts` — Auth setup for Manager/Leader roles
- [ ] Framework install: None — Playwright already configured

## Sources

### Primary (HIGH confidence)
- `apps/web/app/api/challenges/[id]/grading/route.ts` — Existing grading API patterns, auth checks, Supabase queries
- `apps/web/lib/services/workflowNotificationService.ts` — Notification functions to call on approval actions
- `supabase/migrations/20260120_create_challenges.sql` — Existing database schema, status enum, RLS policy patterns
- `packages/auth/server.ts` — Role checking helpers (isLeaderOrAbove, isAdminOrManager)
- `apps/web/app/components/admin/AdminTable.tsx` — Reusable table component for approval queue

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import order, error handling
- `.planning/codebase/STRUCTURE.md` — Where to place new files and components
- `.planning/codebase/ARCHITECTURE.md` — Layer separation, data flow patterns
- `.planning/codebase/TESTING.md` — Playwright testing patterns for E2E tests

### Tertiary (LOW confidence)
- Next.js App Router documentation — RESTful API route patterns
- Supabase RLS documentation — Row level security policy patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use from Phase 1 and 2
- Architecture: HIGH - Based on existing codebase patterns (grading API, auth helpers, notification service)
- Pitfalls: HIGH - Common workflow state management issues documented

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (30 days for stable domain)

---

*Research completed: 2026-03-18*
*Phase: 03-manager-approval-workflow*
