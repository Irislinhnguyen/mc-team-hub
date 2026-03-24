# Test Plan: Monthly Championship Approval Workflow

**Generated:** 2026-03-24
**Status:** READY FOR EXECUTION
**Branch:** main

## Objective

End-to-end test the Monthly Championship (Knowledge Championship) approval workflow to verify it's ready to ship.

## What We're Testing

The complete approval workflow:
1. Leader grades submissions → Submits for Manager review
2. Manager reviews grades → Can edit/approve
3. Manager/Admin publishes leaderboard → Users notified

## Test Accounts Needed

Create 4 test users in Supabase:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@test.com | Test123! | Create challenges, publish leaderboards |
| Manager | manager@test.com | Test123! | Review and approve grades |
| Leader | leader@test.com | Test123! | Grade submissions, submit for review |
| Member | member@test.com | Test123! | Take challenges, view results |

**SQL to create test users:**
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES
  ('admin@test.com', crypt('Test123!', gen_salt('bf')), NOW()),
  ('manager@test.com', crypt('Test123!', gen_salt('bf')), NOW()),
  ('leader@test.com', crypt('Test123!', gen_salt('bf')), NOW()),
  ('member@test.com', crypt('Test123!', gen_salt('bf')), NOW());

-- Assign roles (update with actual user IDs from auth.users)
INSERT INTO user_roles (user_id, role)
VALUES
  ((SELECT id FROM auth.users WHERE email = 'admin@test.com'), 'admin'),
  ((SELECT id FROM auth.users WHERE email = 'manager@test.com'), 'manager'),
  ((SELECT id FROM auth.users WHERE email = 'leader@test.com'), 'leader'),
  ((SELECT id FROM auth.users WHERE email = 'member@test.com'), 'member');

-- Add to a team for challenge access
INSERT INTO user_team_assignments (user_id, team_id)
SELECT id, 'default-team-id' FROM auth.users WHERE email LIKE '%@test.com';
```

## Test Scenarios

### Scenario 1: Basic Approval Flow

**Preconditions:**
- Challenge exists in "grading" status
- At least 1 submission exists
- Logged in as Leader

**Steps:**
1. Leader navigates to `/admin/challenges/{id}/grading`
2. Leader grades all questions
3. Leader clicks "Submit for Review"
4. Verify: Status changes to "pending_review"
5. Verify: Manager receives notification

**Expected Result:** ✅ Submission in pending_review status, Manager notified

---

### Scenario 2: Manager Approval

**Preconditions:**
- Submission in "pending_review" status
- Logged in as Manager

**Steps:**
1. Manager navigates to `/admin/approvals`
2. Manager clicks on pending submission
3. Manager reviews grades
4. Manager optionally edits grades
5. Manager clicks "Approve"
6. Verify: Status changes to "approved"
7. Verify: Leader receives notification

**Expected Result:** ✅ Submission in approved status, Leader notified

---

### Scenario 3: Publish Leaderboard

**Preconditions:**
- All submissions in "approved" status
- Logged in as Manager or Admin

**Steps:**
1. Manager/Admin navigates to challenge page
2. Clicks "Publish Leaderboard"
3. Verify: Challenge status changes to "completed"
4. Verify: Submissions change to "published"
5. Verify: All users receive "Scores Published" notification
6. Member navigates to `/challenges/{id}/leaderboard`
7. Verify: Leaderboard is visible

**Expected Result:** ✅ Leaderboard published, all users notified

---

### Scenario 4: Leader Cannot Publish

**Preconditions:**
- Submission in "approved" status
- Logged in as Leader (NOT Manager/Admin)

**Steps:**
1. Leader attempts to publish leaderboard
2. Verify: API returns 403 Forbidden
3. Verify: Error message says "Only Manager or Admin can publish"

**Expected Result:** ✅ Leader blocked from publishing

---

### Scenario 5: Cannot Publish Unapproved Submissions

**Preconditions:**
- Submission NOT in "approved" status
- Logged in as Manager

**Steps:**
1. Manager attempts to publish leaderboard
2. Verify: API returns 400 Bad Request
3. Verify: Error message mentions pending approvals

**Expected Result:** ✅ Publish blocked until all submissions approved

---

## Verification Commands

```bash
# Start dev server
npm run dev

# Run E2E tests (if available)
npm run test

# Check submission statuses in Supabase
# Run in Supabase SQL Editor:
SELECT id, status, challenge_id, created_at
FROM challenge_submissions
ORDER BY created_at DESC;

# Check notifications
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

## Success Criteria

The Monthly Championship is ready to ship when:

- [ ] Scenario 1 passes: Leader can submit for review
- [ ] Scenario 2 passes: Manager can approve grades
- [ ] Scenario 3 passes: Leaderboard publishes correctly
- [ ] Scenario 4 passes: Leader cannot publish (permission check)
- [ ] Scenario 5 passes: Unapproved submissions block publishing
- [ ] All notifications are sent at correct workflow stages
- [ ] No console errors during the workflow
- [ ] Audit trail exists in `approvals` table

## Rollback Plan (If Issues Found)

If critical bugs are found:

1. Document the bug in a GitHub issue
2. Create a fix branch: `fix/approval-workflow-bug`
3. Implement fix
4. Re-test the affected scenario
5. Merge to main
6. Re-run full test suite

## Next Steps After Shipping

1. Update STATE.md to mark Phase 3 as complete
2. Create GitHub release for Monthly Championship
3. Begin Phase 5: MC Bible Completion

---

**Test Plan Created By:** Claude (Office Hours)
**Ready for Execution:** Yes
**Estimated Test Time:** 1-2 hours
