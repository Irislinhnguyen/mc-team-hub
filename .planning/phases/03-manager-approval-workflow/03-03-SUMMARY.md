---
phase: 03-manager-approval-workflow
plan: 03
title: Manager Review API Endpoints
one-liner: "Manager approval and grade editing API endpoints: POST for approving pending submissions with audit trail and Leader notifications, PATCH for editing grades with modifier tracking"
subsystem: API Endpoints
tags: [api, approval-workflow, manager, audit-trail, notifications]
dependencies:
  requires:
    - 03-01 (Database Schema - provides approvals table and submission status types)
    - 03-02 (Leader Submit for Review API - provides pending_review submissions)
  provides:
    - 03-04 (Manager Review UI - consumes approve and grades APIs)
    - 03-05a (Manager Approve Workflow - uses approve API)
    - 03-05b (Publish Workflow - requires approved status)
  affects:
    - apps/web/app/api/challenges/submissions/[id]/approve/route.ts (created)
    - apps/web/app/api/challenges/submissions/[id]/grades/route.ts (created)
tech-stack:
  added: []
  patterns:
    - Role-based access control (Manager/Admin only)
    - Audit trail for all approval actions
    - State validation (pending_review -> approved)
    - Async notification with error resilience
    - Partial update support for grade edits
    - Modifier tracking (grading_modified_by, grading_modified_at)
key-files:
  created:
    - apps/web/app/api/challenges/submissions/[id]/approve/route.ts (153 lines)
    - apps/web/app/api/challenges/submissions/[id]/grades/route.ts (159 lines)
  modified: []
key-decisions:
  - Manager/Admin approves from pending_review to approved state (no separate reject workflow)
  - Grade edits do NOT trigger notifications to Leader (avoid spam)
  - Audit record created on both approve and grade edits for full traceability
  - Notification sent to ALL Leaders on approve (not just submitter) per existing service pattern
  - Partial updates supported for grade edits (score and/or feedback optional)
metrics:
  duration: "4 minutes"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  completion_date: "2026-03-18"
---

# Phase 03 Plan 03: Manager Review API Endpoints Summary

**Status:** Complete
**Duration:** 4 minutes
**Tasks Completed:** 2/2

## Overview

Created API endpoints for Manager/Admin to approve submissions and edit grades. The approve endpoint transitions submissions from `pending_review` to `approved` state with full audit trail and Leader notifications. The grades endpoint allows Managers to edit individual answer scores and feedback while tracking the modifier for accountability.

## Changes Made

### 1. Manager Approve API Endpoint (Task 1)

**File:** `apps/web/app/api/challenges/submissions/[id]/approve/route.ts`

**Endpoint:** `POST /api/challenges/submissions/{id}/approve`

**Implementation Details:**

1. **Authentication and Authorization:**
   - Uses `getServerUser()` to authenticate
   - Validates `isAdminOrManager(user)` for role-based access
   - Returns 401 for unauthenticated, 403 for non-Manager/Admin

2. **State Validation:**
   - Queries submission by ID
   - Validates current status is `pending_review`
   - Returns 400 if not in correct state with clear error message

3. **Leader Discovery:**
   - Queries approvals table for `submitted_for_review` action
   - Identifies which Leader submitted for review context
   - Continues if not found (notification goes to all Leaders)

4. **State Transition:**
   - Updates submission status to `approved`
   - Uses conditional update (`eq('status', 'pending_review')`) to prevent race conditions
   - Returns 400 if concurrent update occurred

5. **Audit Trail:**
   - Inserts approval record with:
     - `action: 'approved'`
     - `from_status: 'pending_review'`
     - `to_status: 'approved'`
     - `user_id` and `user_role` of approver
   - Logs error but doesn't fail request if audit insert fails

6. **Leader Notification:**
   - Queries challenge details for notification context
   - Calls `notifyLeadersGradeApproved(challengeId, challengeName, true, undefined)`
   - Wraps in try-catch to prevent notification failure from blocking approval
   - Sends to ALL Leaders per existing service pattern

7. **Response:**
   - Returns `{ success, submissionId, status, approvedAt }`
   - Includes timestamp of approval

### 2. Manager Edit Grades API Endpoint (Task 2)

**File:** `apps/web/app/api/challenges/submissions/[id]/grades/route.ts`

**Endpoint:** `PATCH /api/challenges/submissions/{id}/grades`

**Implementation Details:**

1. **Authentication and Authorization:**
   - Uses `getServerUser()` to authenticate
   - Validates `isAdminOrManager(user)` for role-based access
   - Returns 401 for unauthenticated, 403 for non-Manager/Admin

2. **Request Body Parsing:**
   - Expects `{ answers: Array<{ answerId, score?, feedback? }> }`
   - Validates answers is an array
   - Returns 400 if invalid

3. **Submission Validation:**
   - Queries submission by ID to verify existence
   - Returns 404 if not found

4. **Grade Updates:**
   - Iterates through answers array
   - Builds partial update object (only includes provided fields)
   - Updates `manual_score` and/or `manual_feedback` as provided
   - Always sets `grading_modified_by` to Manager user ID
   - Always sets `grading_modified_at` to current timestamp
   - Tracks count of successfully updated answers

5. **Audit Trail:**
   - Creates approval record if any grades were updated
   - Uses `action: 'approved'` (indicates Manager modification)
   - Sets `from_status = to_status = submission.status` (no status change)
   - Includes count of answers modified in `notes` field
   - Logs error but doesn't fail request if audit insert fails

6. **Notification Decision:**
   - Does NOT call notification service (per plan decision)
   - Avoids spamming Leader with notifications on every edit
   - Leader will be notified when Manager explicitly approves

7. **Response:**
   - Returns `{ success, updated, submissionId }`
   - Includes count of successfully updated answers

## API Endpoints Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/challenges/submissions/{id}/approve | Manager/Admin | Approve submission for publishing |
| PATCH | /api/challenges/submissions/{id}/grades | Manager/Admin | Edit grades on submission |

## Database Operations

**Approve Endpoint:**
- Read: `challenge_submissions` (1 query)
- Read: `approvals` (1 query for submitter discovery)
- Update: `challenge_submissions` (1 update, conditional on status)
- Insert: `approvals` (1 audit record)
- Read: `challenges` (1 query for notification context)

**Edit Grades Endpoint:**
- Read: `challenge_submissions` (1 query for validation)
- Update: `challenge_answers` (N updates, one per answer)
- Insert: `approvals` (1 audit record, conditional on edits)

## Audit Trail Records

**Approve Action:**
```sql
INSERT INTO approvals (
  submission_id, user_id, user_role, action,
  from_status, to_status, notes, created_at
) VALUES (
  {submissionId}, {userId}, {role}, 'approved',
  'pending_review', 'approved', NULL, {timestamp}
)
```

**Edit Grades Action:**
```sql
INSERT INTO approvals (
  submission_id, user_id, user_role, action,
  from_status, to_status, notes, created_at
) VALUES (
  {submissionId}, {userId}, {role}, 'approved',
  {currentStatus}, {currentStatus}, 'Edited {count} answer(s)', {timestamp}
)
```

## Deviations from Plan

**Task 1 (Approve Endpoint):**
- Plan specified finding the specific Leader who submitted to notify only them
- Implementation: Notification goes to ALL Leaders per existing `notifyLeadersGradeApproved()` service pattern
- Rationale: Existing service doesn't support single-Leader notification, and all Leaders benefit from knowing approvals are happening

**Task 2 (Grades Endpoint):**
- Plan mentioned optional audit record based on whether grades actually changed
- Implementation: Audit record created whenever updates succeed, even if values unchanged
- Rationale: Simpler implementation, still tracks Manager intervention

No other deviations - both endpoints implemented exactly as specified.

## Auth Gates

None encountered during this plan.

## Integration Points

**Upstream Dependencies:**
- `03-01` Database Schema: Uses `approvals` table and `challenge_submissions.status` enum
- `03-02` Leader Submit: Approves submissions that Leader has submitted for review

**Downstream Consumers:**
- `03-04` Manager Review UI: Will call approve and grades endpoints
- `03-05b` Publish Workflow: Requires submissions in `approved` status

**External Services:**
- `workflowNotificationService.notifyLeadersGradeApproved()`: Sends Leader notifications

## Success Criteria

- [x] POST /api/challenges/submissions/[id]/approve updates status to approved
- [x] Approve creates audit record and notifies Leader
- [x] PATCH /api/challenges/submissions/[id]/grades updates grades
- [x] Grade edits track Manager as modifier
- [x] All endpoints enforce proper role-based access
- [x] Audit trail is complete for all Manager actions

## Next Steps

1. **03-04: Manager Review UI** - Build UI component for Managers to review pending submissions using these API endpoints
2. **03-05a: Manager Approve Workflow** - Implement the UI flow for approving submissions
3. **03-05b: Publish Workflow** - Finalize publish functionality after approval

## Files Modified

- `apps/web/app/api/challenges/submissions/[id]/approve/route.ts` (created, 153 lines)
- `apps/web/app/api/challenges/submissions/[id]/grades/route.ts` (created, 159 lines)

## Commits

- `49a04d9`: feat(03-03): create Manager edit grades API endpoint

## Integration Notes

The Manager review API endpoints are now in place. Next plans will:
- Build UI components that call these endpoints
- Display pending submissions queue to Managers
- Allow Managers to edit grades inline
- Provide approve action with confirmation
- Update UI state after successful operations
