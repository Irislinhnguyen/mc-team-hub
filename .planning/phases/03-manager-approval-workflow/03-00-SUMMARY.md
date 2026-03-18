---
phase: 03-manager-approval-workflow
plan: 00
title: Test Infrastructure for Approval Workflow
one_liner: Playwright E2E test scaffolding for Leader→Manager approval workflow with auth fixtures
subsystem: Testing & Quality Assurance
tags: [testing, e2e, playwright, approval-workflow, test-infrastructure]
wave: 0
dependency_graph:
  requires: []
  provides: [03-01, 03-02, 03-03, 03-04, 03-05a, 03-05b, 03-06]
  affects: []
tech_stack:
  added: []
  patterns:
    - Playwright E2E testing framework
    - Role-based test fixtures (Manager/Leader/Admin)
    - Page object pattern for test helpers
key_files:
  created:
    - path: tests/e2e/fixtures/auth.setup-admin-approver.ts
      description: Auth fixtures for Manager/Leader/Admin role testing
      lines: 297
    - path: tests/e2e/approvals.spec.ts
      description: E2E test suite for approval workflow
      lines: 550
  modified: []
decisions: []
metrics:
  duration: "6 minutes"
  completed_date: "2026-03-18T14:21:00Z"
  tasks_completed: 2
  files_created: 2
  total_lines: 847
---

# Phase 03 Plan 00: Test Infrastructure for Approval Workflow - Summary

**Status:** ✅ COMPLETE
**Duration:** 6 minutes
**Tasks:** 2/2 completed
**Commits:** 2

---

## Overview

Created comprehensive test scaffolding for the Manager Approval Workflow feature using Playwright E2E testing framework. This plan established the testing foundation that all subsequent implementation plans (03-01 through 03-06) can use to verify the approval workflow functionality.

**Key Achievement:** Complete E2E test coverage for Leader→Manager→Publish workflow with role-based auth fixtures.

---

## What Was Built

### 1. Auth Fixtures for Role-Based Testing
**File:** `tests/e2e/fixtures/auth.setup-admin-approver.ts` (297 lines)

**Exports:**
- `TestUser` interface with role-based credentials
- `setupManagerTest(page)` — Login as Manager
- `setupLeaderTest(page)` — Login as Leader
- `setupAdminTest(page)` — Login as Admin
- `setupMemberTest(page)` — Login as Member
- `performLogin(page, email, password)` — Generic login helper
- `createTestChallenge(page, name)` — Create test challenge
- `navigateToApprovals(page)` — Navigate to approvals page
- `navigateToGrading(page, challengeId)` — Navigate to grading page
- `createTestUsers()` — Placeholder for user creation
- `cleanupTestUsers()` — Placeholder for cleanup

**Features:**
- Reusable authentication flow matching the app's email/password login
- Test user credentials for all roles (admin, manager, leader, member)
- Navigation helpers for approval workflow pages
- Graceful handling of missing test data (skip tests with clear messages)

### 2. E2E Test Suite for Approval Workflow
**File:** `tests/e2e/approvals.spec.ts` (550 lines)

**Test Coverage:**

#### Main Test Suite: Manager Approval Workflow
1. ✅ **Leader can submit graded submission for review** — Verifies "Submit for Review" button, status change to `pending_review`
2. ✅ **Manager can view pending approvals queue** — Verifies `/admin/approvals` page loads, table shows pending submissions, filters work
3. ✅ **Manager can edit grades in approval detail view** — Verifies Manager can change scores, add feedback, save changes
4. ✅ **Manager can approve submission** — Verifies Approve button, status change to `approved`, removal from queue
5. ✅ **Manager can publish approved submission** — Verifies Publish button for Manager, status change to `published`
6. ✅ **Leader cannot publish (permission check)** — Verifies publish button disabled/hidden for Leader role
7. ✅ **Audit trail verification** — Verifies approval actions create audit records
8. ✅ **Next/Previous navigation in approval queue** — Verifies navigation between pending submissions

#### Permission Test Suite: Approval Workflow - Permissions
9. ✅ **Member cannot access approvals page** — Verifies 403/redirect for unauthorized access
10. ✅ **Leader cannot approve submissions** — Verifies approve button disabled for Leader

#### Status Transition Test Suite: Approval Workflow - Status Transitions
11. ✅ **Submission status flows correctly** — Placeholder for end-to-end status flow verification

**Test Features:**
- Uses auth fixtures from Task 1 for clean, maintainable tests
- Skips gracefully when test data is missing (clear console messages)
- Covers permission checks (Leader vs Manager vs Admin)
- Tests UI navigation (approval queue list + detail views)
- Verifies status transitions through the approval workflow
- Includes setup/teardown for test users and challenge
- Follows Playwright conventions (test.describe, beforeAll, afterAll)

---

## Test Execution Instructions

### Prerequisites
1. **Test users must exist in database:**
   - `admin@geniee.co.jp` (role: admin)
   - `manager@geniee.co.jp` (role: manager)
   - `leader@geniee.co.jp` (role: leader)
   - `member@geniee.co.jp` (role: member)

2. **Application running locally:**
   ```bash
   npm run dev
   ```

### Run Tests

**Run all approval tests:**
```bash
npx playwright test tests/e2e/approvals.spec.ts
```

**Run specific test:**
```bash
npx playwright test tests/e2e/approvals.spec.ts -g "Leader can submit"
```

**Run with UI (debugging):**
```bash
npx playwright test tests/e2e/approvals.spec.ts --headed
```

**Run with debug mode:**
```bash
npx playwright test tests/e2e/approvals.spec.ts --debug
```

### Expected Behavior
- **Before implementation (NOW):** Tests will SKIP or FAIL because features don't exist yet
- **After implementation (Plans 03-01 through 03-06):** Tests should PASS

---

## Deviations from Plan

**None — Plan executed exactly as written.**

---

## Technical Notes

### Test Design Patterns
1. **Page Object Pattern:** Navigation helpers (`navigateToApprovals`, `navigateToGrading`) encapsulate page navigation logic
2. **Fixture Pattern:** Auth fixtures provide reusable user authentication across tests
3. **Graceful Degradation:** Tests skip with clear messages when test data is missing (no confusing failures)
4. **Role Isolation:** Each test logs in as the appropriate role to test permissions

### Test Data Management
- **Current State:** Tests use hardcoded user credentials
- **Future Enhancement:** Implement `createTestUsers()` and `cleanupTestUsers()` to programmatically manage test data

### Known Limitations
1. **Test User Creation:** `createTestUsers()` is a placeholder — users must exist in database before running tests
2. **Submission Data:** Tests assume graded submissions exist — may need to create these in beforeAll()
3. **Audit Trail UI:** Audit trail test expects UI that may not be implemented — alternative API query commented in test

---

## Integration with Subsequent Plans

These tests provide verification for:

| Plan | What Tests Verify |
|------|-------------------|
| 03-01 (Database Schema) | Status transitions (pending_review → approved → published) |
| 03-02 (Leader Submit Flow) | "Leader can submit graded submission for review" test |
| 03-03 (Manager Review UI) | "Manager can view pending approvals queue" test |
| 03-04 (Manager Edit Grades) | "Manager can edit grades in approval detail view" test |
| 03-05a (Manager Approve) | "Manager can approve submission" test |
| 03-05b (Publish Workflow) | "Manager can publish approved submission" test |
| 03-06 (Integration) | All end-to-end workflow tests |

---

## Success Criteria

- ✅ `tests/e2e/approvals.spec.ts` exists with 8+ test cases
- ✅ `tests/e2e/fixtures/auth.setup-admin-approver.ts` exists with role fixtures
- ✅ Tests can be run with `npx playwright test tests/e2e/approvals.spec.ts`
- ✅ Tests are properly structured and follow Playwright conventions
- ✅ Tests import and use auth fixtures correctly
- ✅ All task commits created with proper format

---

## Files Created

1. **tests/e2e/fixtures/auth.setup-admin-approver.ts** (297 lines)
   - Role-based auth fixtures for Manager/Leader/Admin
   - Login helpers matching the app's authentication flow
   - Navigation helpers for approval workflow pages
   - Test user credentials and interfaces

2. **tests/e2e/approvals.spec.ts** (550 lines)
   - 11 test cases covering approval workflow
   - Permission tests (Leader vs Manager vs Member)
   - Status transition verification
   - Audit trail verification
   - Navigation tests (Next/Previous in queue)

**Total:** 847 lines of test infrastructure

---

## Next Steps

After implementation plans (03-01 through 03-06) are complete:
1. Run the full test suite to verify approval workflow
2. Fix any failing tests (adjust selectors or logic as needed)
3. Add tests to CI/CD pipeline for regression testing
4. Implement `createTestUsers()` and `cleanupTestUsers()` for automated test data management

---

## Commits

1. **4699d44** — `test(03-00): add auth fixtures for Manager/Leader role testing`
   - Created `tests/e2e/fixtures/auth.setup-admin-approver.ts`
   - 297 lines, role-based auth fixtures

2. **6323ee5** — `test(03-00): add E2E test suite for approval workflow`
   - Created `tests/e2e/approvals.spec.ts`
   - 550 lines, 11 test cases

---

**Plan Status:** ✅ COMPLETE
**Test Infrastructure:** ✅ READY FOR IMPLEMENTATION PLANS
