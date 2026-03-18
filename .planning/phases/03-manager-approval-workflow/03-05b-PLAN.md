---
phase: 03-manager-approval-workflow
plan: 05b
type: execute
wave: 5
depends_on: [03-02, 03-03, 03-05a]
files_modified:
  - apps/web/app/components/admin/approvals/ApprovalDetailView.tsx
  - apps/web/app/(protected)/admin/approvals/page.tsx
  - apps/web/app/(protected)/admin/AdminSidebar.tsx
autonomous: false
requirements:
  - APPR-11

must_haves:
  truths:
    - "Manager can click approval to view detail"
    - "Manager can edit grades in detail view"
    - "Manager can approve from detail view"
    - "Manager can navigate next/previous in queue"
    - "AdminSidebar has Approvals navigation link"
  artifacts:
    - path: apps/web/app/components/admin/approvals/ApprovalDetailView.tsx
      provides: Detail view for reviewing single submission
      exports: ["ApprovalDetailView"]
    - path: apps/web/app/(protected)/admin/approvals/page.tsx
      provides: Approval queue page
      contains: "ApprovalQueueTable", "ApprovalDetailView"
    - path: apps/web/app/(protected)/admin/AdminSidebar.tsx
      provides: Navigation sidebar with Approvals link
      contains: "Approvals"
  key_links:
    - from: ApprovalDetailView
      to: /api/challenges/submissions/[id]/grades
      via: fetch PATCH call for grade edits
      pattern: "fetch.*grades"
    - from: ApprovalDetailView
      to: ApproveButton
      via: Component import
      pattern: "import.*ApproveButton"
    - from: approvals page
      to: ApprovalQueueTable
      via: Component import
      pattern: "import.*ApprovalQueueTable"
    - from: AdminSidebar
      to: approvals page
      via: Navigation link
      pattern: "href.*approvals"
---

<objective>
Create Manager approval queue page and detail view: ApprovalDetailView for reviewing submissions with grade editing, approvals page integrating list and detail views, and AdminSidebar navigation.

Purpose: Enable Managers to review pending submissions, edit grades, approve submissions, and navigate through approval queue with next/previous navigation.
Output: Complete approval queue UI with list and detail views, grade editing, approval action, and navigation integration.
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
@.planning/phases/03-manager-approval-workflow/03-03-SUMMARY.md
@.planning/phases/03-manager-approval-workflow/03-05a-SUMMARY.md

@apps/web/app/(protected)/admin/AdminSidebar.tsx
@apps/web/app/components/admin/AdminForm.tsx
@apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx
@apps/web/app/components/admin/approvals/ApproveButton.tsx
</context>

<interfaces>
<!-- Key types and contracts from existing codebase -->

From database.types.ts (after Plan 03-01):
```typescript
type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published'

interface Approval {
  id: string
  submission_id: string
  user_id: string
  user_role: 'leader' | 'manager' | 'admin'
  action: 'submitted_for_review' | 'approved'
  from_status: string
  to_status: string
  notes: string | null
  created_at: string
}
```

From /api/approvals/pending (Plan 03-02):
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

From 03-05a plan components:
```typescript
interface ApprovalQueueTableProps {
  submissions: PendingSubmission[]
  loading?: boolean
  onRowClick: (submissionId: string) => void
  filters?: { challengeId?: string; teamId?: string; leaderId?: string }
}

interface ApproveButtonProps {
  submissionId: string
  currentStatus: SubmissionStatus
  onApproved?: () => void
  disabled?: boolean
}
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create ApprovalDetailView component</name>
  <files>apps/web/app/components/admin/approvals/ApprovalDetailView.tsx</files>
  <read_first>
    apps/web/app/components/admin/approvals/ApproveButton.tsx
    apps/web/app/components/admin/AdminForm.tsx
  </read_first>
  <action>
    Create ApprovalDetailView component at apps/web/app/components/admin/approvals/ApprovalDetailView.tsx:

    1. **Component interface:**
       - interface ApprovalDetailViewProps { submissionId: string; onClose?: () => void; onNext?: () => void; onPrevious?: () => void; hasNext: boolean; hasPrevious: boolean }

    2. **Fetch submission data:**
       - Use TanStack Query useQuery or useEffect to fetch:
         - Submission details (student, team, submitted time)
         - Challenge details (name, id)
         - All answers with grades (auto_score, manual_score, manual_feedback)
         - Approval history (who submitted, when)

    3. **Layout structure:**
       - Top bar: [Previous] [Next] buttons on left, [Approve] [Save Changes] buttons on right
       - Student info section: Name, Team, Submitted time
       - Leader info section: Who graded, When submitted for review
       - Answers list: Each answer with question text, student answer, score, feedback
       - Total score section: Overall score summary

    4. **Grade editing:**
       - For essay answers (manual_score is not null): show score input and feedback textarea
       - Allow Manager to edit manual_score and manual_feedback
       - Show "Last modified by [Manager] at [time]" if grading_modified_by is set
       - Use existing grading form components if available

    5. **Navigation buttons:**
       - Previous button: disabled when !hasPrevious, calls onPrevious
       - Next button: disabled when !hasNext, calls onNext
       - Position in top-left or top-center

    6. **Action buttons:**
       - ApproveButton component for approve action
       - "Save Changes" button for grade edits (doesn't change status)
       - Position in top-right

    7. **Handle grade save:**
       - PATCH /api/challenges/submissions/${submissionId}/grades
       - Send array of edited answers with answerId, score, feedback
       - On success: show toast "Grades saved successfully"
       - Re-fetch submission data to show updated values

    8. **Styling:**
       - Use cards/sections for each part (student info, answers)
       - Use proper spacing (md, lg) between sections
       - Use consistent colors (bg-white, border-gray-200)
       - Responsive design: stack vertically on mobile

    Follow existing detail view patterns in admin interface. Use AdminForm for form inputs.
  </action>
  <verify>
    <automated>grep -q "ApprovalDetailView" apps/web/app/components/admin/approvals/ApprovalDetailView.tsx && grep -q "submissionId" apps/web/app/components/admin/approvals/ApprovalDetailView.tsx</automated>
  </verify>
  <done>
    ApprovalDetailView component fetches and displays submission details, shows all answers with editable grades, provides Previous/Next navigation, includes ApproveButton and Save Changes button, handles grade edits via API, and uses consistent styling with admin interface.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Update barrel export for ApprovalDetailView</name>
  <files>apps/web/app/components/admin/approvals/index.ts</files>
  <read_first>
    apps/web/app/components/admin/approvals/index.ts
  </read_first>
  <action>
    Update barrel export at apps/web/app/components/admin/approvals/index.ts:

    1. **Export ApprovalDetailView:**
       - export { ApprovalDetailView } from './ApprovalDetailView'
       - export type { ApprovalDetailViewProps } from './ApprovalDetailView'

    Keep existing exports for SubmitForReviewButton, ApprovalQueueTable, ApproveButton.
  </action>
  <verify>
    <automated>grep -q "ApprovalDetailView" apps/web/app/components/admin/approvals/index.ts</automated>
  </verify>
  <done>
    Barrel export file updated to export ApprovalDetailView component and its type.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create approvals queue page</name>
  <files>apps/web/app/(protected)/admin/approvals/page.tsx</files>
  <read_first>
    apps/web/app/(protected)/admin/approvals/page.tsx
    apps/web/app/components/admin/approvals/ApprovalQueueTable.tsx
    apps/web/app/components/admin/approvals/ApprovalDetailView.tsx
  </read_first>
  <action>
    Create approvals queue page at apps/web/app/(protected)/admin/approvals/page.tsx:

    1. **Page structure:**
       - Server Component or Client Component based on data fetching needs
       - Import and use AdminLayout or AdminSidebar from existing admin structure

    2. **State management:**
       - const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
       - const [filters, setFilters] = useState({ challengeId: '', teamId: '', leaderId: '' })
       - Track current index in pending submissions list for next/prev navigation

    3. **Fetch pending submissions:**
       - Use useEffect or TanStack Query to fetch from /api/approvals/pending
       - Apply filters as query params (challengeId, teamId, leaderId)
       - Handle loading and error states

    4. **Render list view:**
       - When !selectedSubmissionId: show ApprovalQueueTable with pending submissions
       - Add filter dropdowns at top (Challenge, Team, Leader)
       - Table row click: setSelectedSubmissionId(submissionId)

    5. **Render detail view:**
       - When selectedSubmissionId: show ApprovalDetailView
       - Calculate hasNext/hasPrevious based on index in submissions array
       - Handle onClose: setSelectedSubmissionId(null)
       - Handle onNext: setSelectedSubmissionId(submissions[index + 1].id)
       - Handle onPrevious: setSelectedSubmissionId(submissions[index - 1].id)

    6. **Filter UI:**
       - Use Select components from @/components/ui/select
       - Challenge filter: list of challenges from API or hardcoded
       - Team filter: list of teams from API or hardcoded
       - Leader filter: list of Leaders from users table
       - URL query params sync: update URL when filters change

    7. **AdminHeader:**
       - Use AdminHeader component if available
       - Title: "Approvals"
       - Subtitle: "Review and approve graded submissions"

    8. **Styling:**
       - Use existing admin page layout
       - Responsive: full width table on desktop, card-based on mobile

    Follow existing admin page patterns (e.g., /admin/challenges).
  </action>
  <verify>
    <automated>grep -q "approvals" apps/web/app/\(protected\)/admin/approvals/page.tsx && grep -q "ApprovalQueueTable" apps/web/app/\(protected\)/admin/approvals/page.tsx</automated>
  </verify>
  <done>
    Approvals page exists at /admin/approvals, fetches and displays pending submissions, shows ApprovalQueueTable in list view, shows ApprovalDetailView when submission selected, provides filter controls, handles next/previous navigation, and follows existing admin page layout patterns.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Add Approvals link to AdminSidebar</name>
  <files>apps/web/app/(protected)/admin/AdminSidebar.tsx</files>
  <read_first>
    apps/web/app/(protected)/admin/AdminSidebar.tsx
  </read_first>
  <action>
    Update AdminSidebar at apps/web/app/(protected)/admin/AdminSidebar.tsx:

    1. **Add Approvals navigation item:**
       - Add new navigation item after "Grading" or similar appropriate location
       - Label: "Approvals"
       - Icon: CheckmarkIcon or ClipboardDocumentCheckIcon from Heroicons
       - Route: /admin/approvals
       - Badge: Optional count of pending approvals

    2. **Role-based visibility:**
       - Show Approvals link only for Manager and Admin roles
       - Hide for Leader role

    3. **Pending count badge (optional):**
       - Fetch count from /api/approvals/pending?countOnly=true
       - Show badge with count if > 0
       - Use existing badge pattern if available

    Follow existing AdminSidebar navigation patterns.
  </action>
  <verify>
    <automated>grep -q "Approvals" apps/web/app/\(protected\)/admin/AdminSidebar.tsx && grep -q "approvals" apps/web/app/\(protected\)/admin/AdminSidebar.tsx</automated>
  </verify>
  <done>
    AdminSidebar includes Approvals navigation link with icon and route; link visible only for Manager/Admin roles; optional pending count badge displayed.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete Manager approval queue UI with list and detail views</what-built>
  <how-to-verify>
    1. Visit https://your-app.vercel.app/admin/approvals as a Manager or Admin user
    2. Verify you see the approval queue table with pending submissions (if any exist)
    3. Verify filter dropdowns work (Challenge, Team, Leader)
    4. Click on a submission row to open detail view
    5. In detail view:
       - Verify all answers are displayed with grades
       - Try editing an essay grade (change score or feedback)
       - Click "Save Changes" and verify toast appears
       - Click "Approve" and verify:
         - Status changes to "approved"
         - Toast notification appears
         - Detail view closes or moves to next submission
    6. Test Previous/Next navigation between submissions
    7. Verify that non-Manager users cannot access the page (redirected or 403)
    8. Type "approved" if UI works correctly, or describe issues found
  </how-to-verify>
  <resume-signal>Type "approved" if Manager approval queue UI works correctly, or describe issues to fix</resume-signal>
</task>

</tasks>

<verification>
After all tasks complete:
1. ApprovalDetailView displays submission details correctly
2. Detail view shows all submission data and answers
3. Grade editing saves changes correctly
4. Approve button updates status to approved
5. Next/Previous navigation works
6. Approvals page integrates list and detail views
7. AdminSidebar has Approvals link
8. Notifications are sent to Leader on approve
9. Page is accessible only to Manager/Admin
</verification>

<success_criteria>
1. Manager can view list of pending approvals
2. Manager can filter approvals by challenge/team/leader
3. Manager can click to view submission details
4. Manager can edit grades in detail view
5. Manager can approve submission from detail view
6. Manager can navigate between submissions with next/prev
7. Leader receives notification when Manager approves
8. Page is restricted to Manager/Admin roles
9. AdminSidebar has Approvals navigation link
</success_criteria>

<output>
After completion, create `.planning/phases/03-manager-approval-workflow/03-05b-SUMMARY.md` with:
- Approval queue page structure and routing
- ApprovalDetailView component details
- Filter and navigation implementation
- Grade editing workflow
- Integration with approve and edit grades APIs
- AdminSidebar navigation update
</output>
