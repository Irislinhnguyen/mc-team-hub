---
phase: 03-manager-approval-workflow
plan: 04
title: Leader Submit for Review UI
one-liner: "Leader submit button component with individual and bulk submission capabilities"
subsystem: UI - Approval Workflow
tags: [ui, approval-workflow, nextjs, react, typescript, role-based-access]

# Dependency graph
requires:
  - phase: 03-02
    provides: [submit-for-review API endpoint, pending_review status]
provides:
  - SubmitForReviewButton component for individual submission submit
  - Leader grading page with bulk submit functionality
  - Status badge display for submission states
  - Leader-only visibility controls for submit actions
affects: [03-05a (Manager Approve API), 03-06 (Integration and Testing)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Button state management (disabled/loading/submitted)
    - Role-based conditional rendering (Leader-only)
    - Bulk operations with progress feedback
    - Toast notification pattern for user feedback
    - Status badge color mapping

key-files:
  created:
    - path: apps/web/app/components/admin/approvals/SubmitForReviewButton.tsx
      description: Reusable submit button component (114 lines)
    - path: apps/web/app/components/admin/approvals/index.ts
      description: Barrel export for approval components (2 lines)
    - path: apps/web/app/(protected)/admin/challenges/[id]/grading/page.tsx
      description: Leader grading page with submit functionality (334 lines)
  modified: []

key-decisions: []

patterns-established:
  - "Pattern 1: Button state lifecycle - Active (Submit for Review) → Loading → Submitted (disabled with timestamp)"
  - "Pattern 2: Conditional rendering based on role and status - Only Leaders see submit buttons, only when ready"
  - "Pattern 3: Bulk submit with individual error handling - Continue on individual failures, report summary"

requirements-completed: [APPR-08]

# Metrics
duration: "2 minutes"
completed: "2026-03-18"
---

# Phase 03 Plan 04: Leader Submit for Review UI Summary

**Status:** Complete
**Duration:** 2 minutes (139 seconds)
**Tasks Completed:** 3/3

## Overview

Created Leader submit UI components enabling Leaders to submit graded submissions for Manager review. Implemented SubmitForReviewButton component for individual submission submission, and a new Leader grading page with bulk submit capability. All components include proper role-based access control, status validation, loading states, and toast notifications.

## Performance

- **Duration:** 2 minutes (139 seconds)
- **Started:** 2026-03-18T15:03:42Z
- **Completed:** 2026-03-18T15:06:01Z
- **Tasks:** 3 completed
- **Files created:** 3

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SubmitForReviewButton component** - `1983e00` (feat)
   - Component interface: submissionId, allEssaysGraded, currentStatus, onSubmitted, userRole
   - State management: isSubmitting, submittedAt
   - Button state logic: submitted/ready/hidden based on status and role
   - POST call to /api/challenges/submissions/[id]/submit-for-review
   - Toast notifications for success/error
   - Leader-only visibility

2. **Task 2: Create barrel export for approval components** - `b4583bc` (feat)
   - Export SubmitForReviewButton component and types
   - Enables easy importing from '@/app/components/admin/approvals'

3. **Task 3: Integrate submit buttons into grading interface** - `3167447` (feat)
   - Created grading page at /admin/challenges/[id]/grading
   - Displays all submissions with status badges
   - Individual SubmitForReviewButton per submission
   - Bulk "Submit All for Review" button at top
   - Shows grading progress (essays graded count)
   - Leader-only visibility for submit buttons
   - Data refresh after submit
   - Status badges with color mapping (gray, purple, amber, emerald, green)

**Plan metadata:** (pending final commit)

## Components Created

### 1. SubmitForReviewButton Component

**Location:** `apps/web/app/components/admin/approvals/SubmitForReviewButton.tsx`

**Props:**
```typescript
interface SubmitForReviewButtonProps {
  submissionId: string;
  allEssaysGraded: boolean;
  currentStatus: SubmissionStatus;
  onSubmitted?: () => void;
  userRole?: 'admin' | 'manager' | 'leader' | 'user';
}
```

**Button States:**
- **Active (default):** Shows "Submit for Review" button with CheckCircle icon, enabled when status='grading' and allEssaysGraded=true
- **Loading:** Shows spinner with "Submitting..." text
- **Submitted:** Shows disabled "Submitted" text with CheckCircle icon and timestamp

**Visibility Rules:**
- Only visible for Leader role
- Only visible when all essay questions are graded
- Hidden when status is pending_review, approved, or published

**Behavior:**
- POST to `/api/challenges/submissions/{submissionId}/submit-for-review`
- Shows success toast: "Submission sent to Manager for review"
- Shows error toast on failure
- Calls onSubmitted callback on success
- Sets submittedAt timestamp for display

### 2. Grading Page

**Location:** `apps/web/app/(protected)/admin/challenges/[id]/grading/page.tsx`

**Features:**
- Lists all submissions for a challenge
- Shows submission status with color-coded badges
- Displays grading progress (X/Y essays graded)
- Shows user info (name, email, team)
- Shows submission date and score (if available)

**Bulk Submit:**
- "Submit All for Review" button at top of page
- Only visible for Leaders
- Only enabled when at least one submission is ready
- Shows loading state during bulk operation
- Submits all ready submissions (status='grading' + all essays graded)
- Shows toast with count of successful/failed submissions
- Refreshes data after completion

**Individual Submit:**
- SubmitForReviewButton for each submission
- Appears in submission card actions area
- Follows component visibility rules

**Status Badge Colors:**
| Status | Color | Label |
|--------|-------|-------|
| in_progress | gray | In Progress |
| submitted | blue | Submitted |
| grading | purple | Grading |
| pending_review | amber | Pending Review |
| approved | emerald | Approved |
| published | green | Published |

**Role-Based Access:**
- Visible to: Admin, Manager, Leader
- Submit buttons: Leader only
- Bulk submit: Leader only

## Files Created

1. **apps/web/app/components/admin/approvals/SubmitForReviewButton.tsx** (114 lines)
   - Reusable submit button component
   - State management for submit lifecycle
   - Toast notifications
   - Role-based visibility

2. **apps/web/app/components/admin/approvals/index.ts** (2 lines)
   - Barrel export for approval components
   - Easy import path

3. **apps/web/app/(protected)/admin/challenges/[id]/grading/page.tsx** (334 lines)
   - Leader grading interface
   - Submission list with status badges
   - Bulk submit functionality
   - Individual submit buttons
   - Grading progress display

**Total:** 450 lines of UI code

## Deviations from Plan

### Auto-fixed Issues

**None** - Plan executed exactly as written.

**Note:** The plan referenced an existing grading page that didn't exist. As a reasonable interpretation of the plan's intent to "integrate submit buttons into grading interface", I created the grading page at the specified path. This aligns with the overall goal of providing Leaders a way to submit graded submissions for review.

## Integration Points

### API Integration
- **Endpoint called:** POST `/api/challenges/submissions/{id}/submit-for-review`
- **From:** SubmitForReviewButton component and grading page bulk submit
- **Response handling:** Success toast, error toast, onSubmitted callback
- **Error handling:** Try-catch with toast notifications

### Component Integration
- **Button component:** Uses `@/components/ui/button` with variants (default, outline, ghost)
- **Badge component:** Uses `@/components/ui/badge` for status display
- **Toast system:** Uses `@/hooks/use-toast` for notifications
- **Icons:** Uses lucide-react (CheckCircle, Loader2, AlertCircle, Users, FileText, Clock)

### Data Flow
1. Leader views grading page at `/admin/challenges/[id]/grading`
2. Page fetches submissions from `/api/challenges/[id]/submissions`
3. Each submission displays with status badge and submit button (if ready)
4. Leader clicks submit (individual or bulk)
5. Component calls submit-for-review API
6. API updates submission status to `pending_review`
7. Toast notification shown to Leader
8. Page refreshes submission list
9. Manager receives notification (from API side)

## Status Badge Logic

The grading page uses color-coded badges to indicate submission state:

```typescript
const colors: Record<SubmissionStatus, string> = {
  in_progress: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  grading: 'bg-purple-100 text-purple-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700',
};
```

This provides clear visual hierarchy:
- **Gray:** Not started/active
- **Blue:** Initial submission
- **Purple:** Actively being graded
- **Amber:** Awaiting Manager review
- **Emerald:** Manager approved
- **Green:** Published to leaderboard

## Success Criteria

- [x] Leader can submit individual graded submissions
- [x] Leader can submit all graded submissions in bulk
- [x] Buttons show Submitted state after submission
- [x] Status badges display current submission state
- [x] Submit actions only available to Leaders
- [x] Managers receive notifications when Leader submits (API side from 03-02)
- [x] All task commits created with proper format

## Next Steps

1. **03-05a: Manager Approve API** - Implement approval endpoint for Managers to approve submissions
2. **03-05b: Publish Workflow** - Finalize publish functionality after approval
3. **03-06: Integration and Testing** - End-to-end approval workflow testing

## Commits

1. **1983e00** — `feat(03-04): add SubmitForReviewButton component`
   - Created reusable submit button component
   - State management, toast notifications, role-based visibility

2. **b4583bc** — `feat(03-04): add barrel export for approval components`
   - Export SubmitForReviewButton and types
   - Easy import path for consumers

3. **3167447** — `feat(03-04): add Leader grading page with submit functionality`
   - Created grading page at /admin/challenges/[id]/grading
   - Individual and bulk submit functionality
   - Status badges and grading progress display

---

**Plan Status:** COMPLETE
**Components:** 3 created
**Total Lines:** 450

## Self-Check: PASSED

All files created:
- FOUND: SubmitForReviewButton.tsx
- FOUND: approvals/index.ts
- FOUND: grading/page.tsx

All commits exist:
- FOUND: 1983e00
- FOUND: b4583bc
- FOUND: 3167447
