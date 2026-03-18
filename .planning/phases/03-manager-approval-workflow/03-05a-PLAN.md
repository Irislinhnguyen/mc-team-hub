---
phase: 03-manager-approval-workflow
plan: 05a
type: execute
wave: 4
depends_on: [03-02]
files_modified:
  - apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx
  - apps/web/app/components/admin/approvals/ApproveButton.tsx
  - apps/web/app/components/admin/approvals/index.ts
autonomous: true
requirements:
  - APPR-09
  - APPR-10

must_haves:
  truths:
    - "Manager can see list of pending approvals"
    - "Manager can click approval to view detail"
    - "ApproveButton component exists for approval action"
  artifacts:
    - path: apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx
      provides: Table component for pending approvals list
      exports: ["ApprovalQueueTable"]
    - path: apps/web/app/components/admin/approvals/ApproveButton.tsx
      provides: Approve action button component
      exports: ["ApproveButton"]
    - path: apps/web/app/components/admin/approvals/index.ts
      provides: Barrel export for approval components
      exports: ["ApprovalQueueTable", "ApproveButton"]
  key_links:
    - from: ApprovalQueueTable
      to: PendingSubmission[]
      via: Component props
      pattern: "submissions.*PendingSubmission"
    - from: ApproveButton
      to: /api/challenges/submissions/[id]/approve
      via: fetch POST call
      pattern: "fetch.*approve"
---

<objective>
Create approval queue UI components: ApprovalQueueTable for listing pending submissions and ApproveButton for approval action.

Purpose: Provide the foundational UI components that the approval queue page will use to display pending submissions and approve them.
Output: ApprovalQueueTable and ApproveButton components with proper typing, styling, and API integration.
</objective>

<execution_context>
@/Users/nguyenthuylinh/.claude/get-shit-done/workflows/execute-plan.md
@/Users/nguyenthuylinh/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-manager-approval-workflow/03-CONTEXT.md
@.planning/phases/03-manager-approval-workflow/03-RESEARCH.md
@.planning/phases/03-manager-approval-workflow/03-UI-SPEC.md
@.planning/phases/03-manager-approval-workflow/03-02-SUMMARY.md

@apps/web/app/components/admin/AdminTable.tsx
@apps/web/app/components/ui/table.tsx
@apps/web/app/components/ui/button.tsx
</context>

<interfaces>
<!-- Key types and contracts from existing codebase -->

From database.types.ts (after Plan 03-01):
```typescript
type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published'
```

From /api/approvals/pending response (Plan 03-02):
```typescript
interface PendingSubmission {
  id: string
  challenge_id: string
  challenge_name: string
  user_id: string
  user_name: string
  user_email: string
  team_id: string
  status: SubmissionStatus
  created_at: string
  updated_at: string
  submitted_by?: string
}
```

From UI-SPEC.md layout:
```
Approval Queue Page:
┌─────────────────────────────────────────────────────┐
│ AdminHeader: "Approvals"                            │
├─────────────────────────────────────────────────────┤
│ Filters: [Challenge ▼] [Team ▼] [Leader ▼]         │
├─────────────────────────────────────────────────────┤
│ AdminTable (ApprovalQueueTable)                     │
│ ┌───────┬──────────┬──────┬──────────┬──────────┐   │
│ │Challenge│ Student  │ Team │ Submitted │ Status   │   │
│ ├───────┼──────────┼──────┼──────────┼──────────┤   │
│ │ Mar Quiz│ John Doe │ Alpha│ 2h ago   │ Pending  │ ← Click to open detail
│ └───────┴──────────┴──────┴──────────┴──────────┘   │
└─────────────────────────────────────────────────────┘
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create ApprovalQueueTable component</name>
  <files>apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx</files>
  <read_first>
    apps/web/app/components/admin/AdminTable.tsx
    apps/web/app/components/ui/table.tsx
  </read_first>
  <action>
    Create ApprovalQueueTable component at apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx:

    1. **Component interface:**
       - interface ApprovalQueueTableProps { submissions: PendingSubmission[]; loading?: boolean; onRowClick: (submissionId: string) => void; filters?: { challengeId?: string; teamId?: string; leaderId?: string } }

    2. **Type definitions:**
       - interface PendingSubmission { id: string; challenge_id: string; challenge_name: string; user_id: string; user_name: string; user_email: string; team_id: string; status: SubmissionStatus; created_at: string; updated_at: string; submitted_by?: string }

    3. **Table columns:**
       - Challenge: challenge_name
       - Student: user_name (with email as subtitle)
       - Team: team_id (or team name if join available)
       - Submitted: formatted date (e.g., "2h ago", "Mar 18, 3PM")
       - Status: Badge component with color coding (amber-500 for pending_review)
       - Graded by: submitted_by (Leader name from approvals)

    4. **Render with AdminTable or custom Table:**
       - Use existing AdminTable component from @/app/components/admin/AdminTable if it fits
       - OR build custom table using Table components from @/components/ui/table
       - Row click handler: calls onRowClick(submissionId)

    5. **Empty state:**
       - If submissions.length === 0: show "No submissions pending review" message
       - Use UI-SPEC copy: "All submissions have been reviewed. Check back later when Leaders submit new grades."

    6. **Styling:**
       - Use Tailwind classes matching existing admin tables
       - Hover state on rows (bg-gray-50)
       - Cursor pointer on clickable rows
       - Status badges with proper colors per UI-SPEC

    Follow existing AdminTable patterns for consistency.
  </action>
  <verify>
    <automated>grep -q "ApprovalQueueTable" apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx && grep -q "onRowClick" apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx</automated>
  </verify>
  <done>
    ApprovalQueueTable component displays pending submissions in table format with columns for Challenge, Student, Team, Submitted time, Status, and Graded by; handles row clicks for detail view; shows empty state when no pending submissions; uses consistent styling with existing admin tables.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create ApproveButton component</name>
  <files>apps/web/app/components/admin/approvals/ApproveButton.tsx</files>
  <read_first>
    apps/web/app/components/ui/button.tsx
  </read_first>
  <action>
    Create ApproveButton component at apps/web/app/components/admin/approvals/ApproveButton.tsx:

    1. **Component interface:**
       - interface ApproveButtonProps { submissionId: string; currentStatus: SubmissionStatus; onApproved?: () => void; disabled?: boolean }

    2. **State management:**
       - const [isApproving, setIsApproving] = useState(false)

    3. **Determine button state:**
       - if currentStatus !== 'pending_review': disabled (shouldn't happen in normal flow)
       - if disabled prop: disabled
       - Otherwise: enabled

    4. **Handle approve:**
       - async function handleApprove()
       - setIsApproving(true)
       - fetch POST /api/challenges/submissions/${submissionId}/approve
       - On success: call onApproved?.(), show toast "Grades approved and ready to publish"
       - On error: show error toast
       - setIsApproving(false)

    5. **Render button:**
       - Use Button component from @/components/ui/button
       - Variant: "default" with bg-[#10B981] (emerald-500) for approve action per UI-SPEC
       - Label: "Approve" (or "Approving..." when loading)
       - Show loading spinner when isApproving
       - Disabled when not pending_review

    6. **Use toast for notifications:**
       - Import toast from existing toast system
       - Show success toast: "Grades approved and ready to publish"
       - Show error toast on failure

    Follow SubmitForReviewButton patterns for consistency.
  </action>
  <verify>
    <automated>grep -q "ApproveButton" apps/web/app/components/admin/approvals/ApproveButton.tsx && grep -q "approve" apps/web/app/components/admin/approvals/ApproveButton.tsx</automated>
  </verify>
  <done>
    ApproveButton component exists with props for submissionId, currentStatus, onApproved callback; handles approve API call with loading state; shows toast notifications; enabled only for pending_review status.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Update barrel export for approval components</name>
  <files>apps/web/app/components/admin/approvals/index.ts</files>
  <read_first>
    apps/web/app/components/admin/approvals/index.ts
  </read_first>
  <action>
    Update barrel export at apps/web/app/components/admin/approvals/index.ts:

    1. **Export new components:**
       - export { ApprovalQueueTable } from './ApprovalQueueTable'
       - export { ApproveButton } from './ApproveButton'
       - Keep existing exports: SubmitForReviewButton

    2. **Export types:**
       - export type { ApprovalQueueTableProps } from './ApprovalQueueTable'
       - export type { ApproveButtonProps } from './ApproveButton'
       - Keep existing type exports

    This makes it easy to import approval components: import { ApprovalQueueTable, ApproveButton } from '@/app/components/admin/approvals'
  </action>
  <verify>
    <automated>grep -q "ApprovalQueueTable" apps/web/app/components/admin/approvals/index.ts && grep -q "ApproveButton" apps/web/app/components/admin/approvals/index.ts</automated>
  </verify>
  <done>
    Barrel export file updated to export ApprovalQueueTable and ApproveButton components and their types for easy importing.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. ApprovalQueueTable component displays pending submissions correctly
2. Table has proper columns and styling
3. Row clicks trigger onRowClick callback
4. ApproveButton component renders and handles approve action
5. ApproveButton shows proper loading/disabled states
6. Both components exported from barrel file
</verification>

<success_criteria>
1. ApprovalQueueTable exists and can render PendingSubmission[]
2. ApproveButton exists and can call approve API
3. Both components follow existing UI patterns
4. Components exported from barrel file
</success_criteria>

<output>
After completion, create `.planning/phases/03-manager-approval-workflow/03-05a-SUMMARY.md` with:
- ApprovalQueueTable component details
- ApproveButton component details
- Integration with approve API
- Styling and state management patterns
</output>
