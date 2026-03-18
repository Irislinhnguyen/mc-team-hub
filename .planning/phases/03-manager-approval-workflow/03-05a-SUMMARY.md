---
phase: 03-manager-approval-workflow
plan: 05a
title: Manager Approve UI Components
one-liner: "Approval queue UI components with table for pending submissions and ApproveButton for approval action"
subsystem: UI - Approval Workflow
tags: [ui, approval-workflow, nextjs, typescript, radix-ui]

# Dependency graph
requires:
  - phase: 03-02
    provides: [pending approvals API endpoint, PendingSubmission interface]
provides:
  - ApprovalQueueTable component for listing pending submissions
  - ApproveButton component for approval action
  - Barrel export for approval components
affects: [03-05b (Publish Workflow), 03-06 (Integration and Testing)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AdminTable component reuse with Column interface
    - Status badge color coding per UI-SPEC
    - Empty state with contextual copy
    - Loading state for async data
    - Button component with loading spinner
    - Toast notifications for user feedback
    - Client-side component pattern with 'use client'

key-files:
  created:
    - path: apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx
      description: Table component for pending approvals list (144 lines)
    - path: apps/web/app/components/admin/approvals/ApproveButton.tsx
      description: Approve action button component (91 lines)
  modified:
    - path: apps/web/app/components/admin/approvals/index.ts
      description: Barrel export for approval components (4 additions)

key-decisions: []

patterns-established:
  - "Pattern 1: AdminTable column definitions - Use Column<T> interface with key, header, render function for type-safe table columns"
  - "Pattern 2: Status badge color coding - Semantic colors map to workflow states (amber-500 for pending, emerald-500 for approved)"
  - "Pattern 3: Empty state messaging - Provide contextual copy when no data exists"
  - "Pattern 4: Action button loading states - Show spinner and change text during async operations"

requirements-completed: [APPR-09, APPR-10]

# Metrics
duration: "1 minute"
completed: "2026-03-18"
---

# Phase 03 Plan 05a: Manager Approve UI Components Summary

**Status:** Complete
**Duration:** 1 minute (51 seconds)
**Tasks Completed:** 3/3

## Overview

Created foundational UI components for the Manager approval queue: ApprovalQueueTable for displaying pending submissions with proper columns and styling, and ApproveButton for the approve action with API integration and loading states. Both components follow existing UI patterns from Phase 1 admin components and Phase 3 UI-SPEC.

## Performance

- **Duration:** 1 minute (51 seconds)
- **Started:** 2026-03-18T15:08:27Z
- **Completed:** 2026-03-18T15:09:18Z
- **Tasks:** 3 completed
- **Files created:** 2
- **Files modified:** 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ApprovalQueueTable component** - `930979c` (feat)
   - Table component with AdminTable pattern
   - Columns: Challenge, Student (with email), Team, Submitted time, Status
   - Empty state with UI-SPEC copy
   - StatusBadge component with proper color coding
   - Time formatting using date-fns

2. **Task 2: Create ApproveButton component** - `f31f268` (feat)
   - Approve action button with loading state
   - Calls POST /api/challenges/submissions/[id]/approve
   - Toast notifications for success/error
   - Emerald-500 color per UI-SPEC
   - Follows SubmitForReviewButton patterns

3. **Task 3: Update barrel export for approval components** - `e389f93` (feat)
   - Added ApprovalQueueTable and types exports
   - Added ApproveButton and types exports
   - Enables easy importing from barrel file

**Plan metadata:** (pending final commit)

## Components Created

### 1. ApprovalQueueTable Component

**Location:** `apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx`

**Purpose:** Display list of pending submissions for Manager review

**Interface:**
```typescript
interface ApprovalQueueTableProps {
  submissions: PendingSubmission[];
  loading?: boolean;
  onRowClick: (submissionId: string) => void;
  filters?: { challengeId?: string; teamId?: string; leaderId?: string };
}
```

**Features:**
- **Table columns:**
  - Challenge: Challenge name (bold)
  - Student: User name with email subtitle
  - Team: Team ID or "Unassigned"
  - Submitted: Relative time (e.g., "2 hours ago") with Clock icon
  - Status: Color-coded badge per UI-SPEC

- **States:**
  - Empty: "No submissions pending review" with contextual message
  - Loading: "Loading approvals..." message
  - Data: Table with hoverable, clickable rows

- **StatusBadge colors:**
  - `pending_review`: amber-500 (amber-100/700)
  - `approved`: emerald-500 (emerald-100/700)
  - `published`: blue-600 (blue-100/700)
  - Other: gray-500

**Integration:**
- Uses AdminTable component from Phase 1
- Uses date-fns for time formatting
- Uses Lucide icons (Clock)

### 2. ApproveButton Component

**Location:** `apps/web/app/components/admin/approvals/ApproveButton.tsx`

**Purpose:** Approve action button for Manager to approve grades

**Interface:**
```typescript
interface ApproveButtonProps {
  submissionId: string;
  currentStatus: SubmissionStatus;
  onApproved?: () => void;
  disabled?: boolean;
}
```

**Features:**
- **API integration:** POST /api/challenges/submissions/[id]/approve
- **States:**
  - Enabled: When status is 'pending_review'
  - Disabled: When status is not pending_review or when loading
  - Hidden: When not in pending_review state (optional)

- **Visual feedback:**
  - Loading spinner during API call
  - Text changes to "Approving..." during loading
  - Emerald-500 color (#10B981) per UI-SPEC
  - CheckCircle icon

- **Toast notifications:**
  - Success: "Grades approved and ready to publish"
  - Error: Error message from API or generic failure

**Integration:**
- Uses Button component from ui/button
- Uses toast from hooks/use-toast
- Follows SubmitForReviewButton patterns

### 3. Barrel Export

**Location:** `apps/web/app/components/admin/approvals/index.ts`

**Exports:**
```typescript
// Components
export { ApprovalQueueTable } from './ApprovalQueueTable';
export { ApproveButton } from './ApproveButton';
export { SubmitForReviewButton } from './SubmitForReviewButton';

// Types
export type { ApprovalQueueTableProps, PendingSubmission } from './ApprovalQueueTable';
export type { ApproveButtonProps } from './ApproveButton';
export type { SubmitForReviewButtonProps } from './SubmitForReviewButton';
```

**Usage:**
```typescript
import { ApprovalQueueTable, ApproveButton } from '@/app/components/admin/approvals';
```

## Styling and Patterns

### Design System Compliance

**Colors:**
- Pending review: amber-500 (#F59E0B)
- Approved: emerald-500 (#10B981)
- Published: blue-600 (#1565C0)
- Primary blue: #1565C0 (existing)

**Typography:**
- Body: 14px, font-weight 400
- Label: 14px, font-weight 600
- Email subtitle: 12px, color gray-500

**Spacing:**
- Table padding: sm (8px)
- Gap between icon and text: 1 (4px)
- Empty state padding: py-12 (48px)

### Component Patterns

**AdminTable Pattern:**
- Generic Column<T> interface
- onRowClick handler for navigation
- Hover state on rows (bg-muted/50)
- Cursor pointer for clickable rows

**Button Pattern:**
- Size="sm" for compact action buttons
- Loading state with spinner
- Icon + text layout
- Consistent hover states

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Integration Points

### API Integration

**ApproveButton → POST /api/challenges/submissions/[id]/approve**
- Created in Plan 03-03 (Manager Review API Endpoints)
- Expects: `{ success: true, approval: {...} }`
- Error handling with toast notifications

**PendingSubmission Interface**
- Defined by GET /api/approvals/pending response (Plan 03-02)
- Includes: id, challenge_id, challenge_name, user_id, user_name, user_email, team_id, status, submitted_at, created_at, updated_at

### UI Component Dependencies

**Components from Phase 1:**
- AdminTable: `@/app/components/admin/AdminTable`
- Button: `@/components/ui/button`
- Badge: `@/components/ui/badge`

**Components from Phase 2:**
- Toast: `@/hooks/use-toast`

**Libraries:**
- date-fns: Time formatting (formatDistanceToNow)
- lucide-react: Icons (Clock, CheckCircle, Loader2)

## Success Criteria

- [x] ApprovalQueueTable exists and can render PendingSubmission[]
- [x] Table has proper columns (Challenge, Student, Team, Submitted, Status)
- [x] Row clicks trigger onRowClick callback
- [x] Empty state shows UI-SPEC copy
- [x] ApproveButton exists and can call approve API
- [x] ApproveButton shows proper loading/disabled states
- [x] Both components follow existing UI patterns
- [x] Components exported from barrel file
- [x] All task commits created with proper format

## Next Steps

1. **03-05b: Publish Workflow** - Implement publish functionality after approval
2. **03-06: Integration and Testing** - End-to-end approval workflow testing
3. **Create approval queue page** - Route at /admin/approvals using these components
4. **Create approval detail view** - Single submission review with ApproveButton integration

## Commits

1. **930979c** — `feat(03-05a): add ApprovalQueueTable component`
   - Table component with AdminTable pattern
   - Columns: Challenge, Student, Team, Submitted, Status
   - Empty state, loading state, status badges

2. **f31f268** — `feat(03-05a): add ApproveButton component`
   - Approve action button with API integration
   - Loading state, toast notifications, emerald-500 color

3. **e389f93** — `feat(03-05a): update barrel export for approval components`
   - Added ApprovalQueueTable and ApproveButton exports
   - Added type exports for easy importing

---

**Plan Status:** COMPLETE
**Components:** 2 created, 1 modified
**Total Lines:** 235 (144 + 91 + 4)
