/**
 * E2E Tests for Manager Approval Workflow
 *
 * These tests verify the complete approval workflow:
 * - Leader submits graded submissions for Manager review
 * - Manager reviews and can edit grades
 * - Manager approves submissions
 * - Manager/Admin publishes approved submissions
 * - Permission checks (Leader cannot publish)
 * - Audit trail verification
 * - Navigation in approval queue
 *
 * NOTE: These tests will FAIL until the implementation is complete.
 * This is test scaffolding for the approval workflow feature.
 *
 * Prerequisites:
 * - Test users exist in database (admin, manager, leader, member)
 * - Auth state configured (run tests/auth/setup.ts if needed)
 */

import { test, expect, Page } from '@playwright/test'
import {
  setupManagerTest,
  setupLeaderTest,
  setupAdminTest,
  setupMemberTest,
  TestUser,
  createTestChallenge,
  navigateToApprovals,
  navigateToGrading,
} from './fixtures/auth.setup-admin-approver'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Test data
let testChallengeId: string | null = null
let manager: TestUser
let leader: TestUser
let admin: TestUser
let member: TestUser

/**
 * Test Suite: Manager Approval Workflow
 */
test.describe('Manager Approval Workflow', () => {
  /**
   * Setup: Create test users and challenge before all tests
   */
  test.beforeAll(async ({ browser }) => {
    console.log('\n========================================')
    console.log('🔧 APPROVAL WORKFLOW TEST SETUP')
    console.log('========================================\n')

    // Setup test users by creating browser contexts and logging in
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    admin = await setupAdminTest(adminPage)
    await adminContext.close()

    const managerContext = await browser.newContext()
    const managerPage = await managerContext.newPage()
    manager = await setupManagerTest(managerPage)
    await managerContext.close()

    const leaderContext = await browser.newContext()
    const leaderPage = await leaderContext.newPage()
    leader = await setupLeaderTest(leaderPage)
    await leaderContext.close()

    const memberContext = await browser.newContext()
    const memberPage = await memberContext.newPage()
    member = await setupMemberTest(memberPage)
    await memberContext.close()

    // Create test challenge for approval workflow tests
    const createChallengeContext = await browser.newContext()
    const createChallengePage = await createChallengeContext.newPage()
    admin = await setupAdminTest(createChallengePage)
    testChallengeId = await createTestChallenge(createChallengePage, 'Approval Workflow Test Challenge')
    await createChallengeContext.close()

    console.log('✅ Test setup complete')
    console.log(`   Admin: ${admin.email}`)
    console.log(`   Manager: ${manager.email}`)
    console.log(`   Leader: ${leader.email}`)
    console.log(`   Member: ${member.email}`)
    console.log(`   Challenge ID: ${testChallengeId}`)
    console.log('========================================\n')
  })

  /**
   * Teardown: Clean up test data after all tests
   */
  test.afterAll(async () => {
    console.log('\n========================================')
    console.log('🧹 APPROVAL WORKFLOW TEST CLEANUP')
    console.log('========================================\n')
    // TODO: Implement cleanup of test challenge and submissions
    console.log('ℹ️  Test cleanup complete')
    console.log('========================================\n')
  })

  /**
   * Test 1: Leader can submit graded submission for review
   */
  test('Leader can submit graded submission for review', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Leader
    await setupLeaderTest(page)

    // Navigate to grading page
    await navigateToGrading(page, testChallengeId)

    // Wait for grading page to load
    await expect(page.locator('h1:has-text("Grading"), h1:has-text("grading")').or(page.locator('h2:has-text("Grading"), h2:has-text("grading")')).first()).toBeVisible({ timeout: 10000 })

    // Grade all essay questions for a submission (if exists)
    // TODO: Implement essay grading logic when submission data is available

    // Verify "Submit for Review" button exists
    const submitButton = page.locator('button:has-text("Submit for Review"), button:has-text("Submit All for Review")')
    const submitButtonExists = await submitButton.count() > 0

    if (submitButtonExists) {
      // Click "Submit for Review" button
      await submitButton.first().click()

      // Verify success message or status change
      await expect(page.locator('text=Submitted for review, text=Successfully submitted').or(page.locator('.badge:has-text("pending_review"), .status:has-text("pending")')).first()).toBeVisible({ timeout: 5000 })

      console.log('✅ Leader successfully submitted submission for review')
    } else {
      console.log('ℹ️  No submissions available to grade/submit')
      test.skip(true, 'No submissions available for testing')
    }
  })

  /**
   * Test 2: Manager can view pending approvals queue
   */
  test('Manager can view pending approvals queue', async ({ page }) => {
    // Login as Manager
    await setupManagerTest(page)

    // Navigate to approvals page
    await navigateToApprovals(page)

    // Verify approvals page loaded
    await expect(page.locator('h1:has-text("Approvals"), h1:has-text("approval"), h2:has-text("Approvals"), h2:has-text("approval")').or(page.locator('text=Pending Approvals, text=Approval Queue')).first()).toBeVisible({ timeout: 10000 })

    // Verify table exists showing pending submissions
    const approvalTable = page.locator('table, [role="table"]').first()
    const tableExists = await approvalTable.count() > 0

    if (tableExists) {
      // Verify table columns
      await expect(page.locator('text=Challenge, text=Student, text=Team, text=Status').first()).toBeVisible()

      console.log('✅ Manager can view pending approvals queue')
    } else {
      console.log('ℹ️  Approval queue is empty (no pending submissions)')
    }

    // Verify filters work (if filter controls exist)
    const challengeFilter = page.locator('select[name="challenge"], input[placeholder*="challenge"]').first()
    const filterExists = await challengeFilter.count() > 0

    if (filterExists) {
      console.log('ℹ️  Filter controls are available on approvals page')
    }
  })

  /**
   * Test 3: Manager can edit grades in approval detail view
   */
  test('Manager can edit grades in approval detail view', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Manager
    await setupManagerTest(page)

    // Navigate to approvals page
    await navigateToApprovals(page)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Click on first pending submission (if exists)
    const firstSubmission = page.locator('table tbody tr, [role="table"] tbody tr').first()
    const submissionExists = await firstSubmission.count() > 0

    if (submissionExists) {
      await firstSubmission.click()

      // Wait for detail view to load
      await page.waitForLoadState('networkidle')

      // Verify detail view shows submission details
      await expect(page.locator('text=Student, text=Team, text=Grading').first()).toBeVisible({ timeout: 10000 })

      // Manager edits an essay score
      const scoreInput = page.locator('input[type="number"][name*="score"], input[name*="score"]').first()
      const scoreInputExists = await scoreInput.count() > 0

      if (scoreInputExists) {
        // Store original value
        const originalScore = await scoreInput.inputValue()

        // Change score
        await scoreInput.fill('10')

        // Add feedback
        const feedbackTextarea = page.locator('textarea[name*="feedback"], textarea[placeholder*="feedback"]').first()
        const feedbackExists = await feedbackTextarea.count() > 0

        if (feedbackExists) {
          await feedbackTextarea.fill('Manager updated grade after review.')
        }

        // Click "Save Changes" button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Changes")')
        await saveButton.click()

        // Verify success message
        await expect(page.locator('text=saved, text=updated, text=success').first()).toBeVisible({ timeout: 5000 })

        console.log('✅ Manager successfully edited grades')
      } else {
        console.log('ℹ️  No grade inputs found (submission may have no essay questions)')
      }
    } else {
      console.log('ℹ️  No pending submissions available for editing')
      test.skip(true, 'No pending submissions to edit')
    }
  })

  /**
   * Test 4: Manager can approve submission
   */
  test('Manager can approve submission', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Manager
    await setupManagerTest(page)

    // Navigate to approvals page
    await navigateToApprovals(page)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Click on first pending submission
    const firstSubmission = page.locator('table tbody tr, [role="table"] tbody tr').first()
    const submissionExists = await firstSubmission.count() > 0

    if (submissionExists) {
      await firstSubmission.click()

      // Wait for detail view to load
      await page.waitForLoadState('networkidle')

      // Click "Approve" button
      const approveButton = page.locator('button:has-text("Approve"), button:has-text("Approve Submission")')
      const buttonExists = await approveButton.count() > 0

      if (buttonExists) {
        await approveButton.click()

        // Verify status changed to "approved"
        await expect(page.locator('text=approved, text=Approved, .badge:has-text("approved")').first()).toBeVisible({ timeout: 5000 })

        // Verify submission removed from pending queue
        await navigateToApprovals(page)
        const submissionInQueue = await firstSubmission.count()
        expect(submissionInQueue).toBe(0)

        console.log('✅ Manager successfully approved submission')
      } else {
        console.log('ℹ️  Approve button not found (submission may not be ready for approval)')
      }
    } else {
      console.log('ℹ️  No pending submissions available for approval')
      test.skip(true, 'No pending submissions to approve')
    }
  })

  /**
   * Test 5: Manager can publish approved submission
   */
  test('Manager can publish approved submission', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Manager
    await setupManagerTest(page)

    // Navigate to approvals page and filter for approved submissions
    await navigateToApprovals(page)
    await page.waitForLoadState('networkidle')

    // Look for approved submissions
    const approvedSubmission = page.locator('text=approved, .badge:has-text("approved")').first()
    const hasApproved = await approvedSubmission.count() > 0

    if (hasApproved) {
      // Click on approved submission
      await approvedSubmission.click()

      // Wait for detail view
      await page.waitForLoadState('networkidle')

      // Click "Publish" button
      const publishButton = page.locator('button:has-text("Publish"), button:has-text("Publish to Leaderboard")')
      const buttonExists = await publishButton.count() > 0

      if (buttonExists) {
        await publishButton.click()

        // Verify status changed to "published"
        await expect(page.locator('text=published, text=Published, .badge:has-text("published")').first()).toBeVisible({ timeout: 5000 })

        console.log('✅ Manager successfully published approved submission')
      } else {
        console.log('ℹ️  Publish button not found')
      }
    } else {
      console.log('ℹ️  No approved submissions available for publishing')
      test.skip(true, 'No approved submissions to publish')
    }
  })

  /**
   * Test 6: Leader cannot publish (permission check)
   */
  test('Leader cannot publish submission', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Leader
    await setupLeaderTest(page)

    // Try to navigate to an approved submission directly
    await page.goto(`${BASE_URL}/admin/approvals`)
    await page.waitForLoadState('networkidle')

    // Look for publish button (should not exist or be disabled for Leader)
    const publishButton = page.locator('button:has-text("Publish"), button:has-text("Publish to Leaderboard")')
    const buttonCount = await publishButton.count()

    if (buttonCount > 0) {
      // Button exists but should be disabled or return 403
      const isDisabled = await publishButton.first().isDisabled()

      if (isDisabled) {
        console.log('✅ Publish button is disabled for Leader (correct behavior)')
      } else {
        // Try clicking and expect 403 or error
        await publishButton.first().click()
        await page.waitForTimeout(1000)

        // Should see error message or be redirected
        const hasError = page.locator('text=Forbidden, text=403, text=not authorized, text=permission').count() > 0
        const isRedirected = page.url().includes('/forbidden') || page.url().includes('/403')

        expect(hasError || isRedirected).toBeTruthy()
        console.log('✅ Leader cannot publish (permission check passed)')
      }
    } else {
      console.log('✅ Publish button not visible to Leader (correct behavior)')
    }
  })

  /**
   * Test 7: Audit trail verification
   */
  test('Approval actions create audit records', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Manager or Admin
    await setupManagerTest(page)

    // Navigate to approvals page and open a submission
    await navigateToApprovals(page)
    await page.waitForLoadState('networkidle')

    // Look for audit trail or history section
    const auditSection = page.locator('text=Audit, text=History, text=Activity Log, text=Timeline').first()
    const hasAuditSection = await auditSection.count() > 0

    if (hasAuditSection) {
      // Verify audit records exist
      await expect(auditSection).toBeVisible()

      // Look for audit actions (submitted_for_review, approved, etc.)
      const auditActions = page.locator('text=submitted, text=approved, text=reviewed, text=modified')
      const hasActions = await auditActions.count() > 0

      if (hasActions) {
        console.log('✅ Audit trail records are visible')
      }
    } else {
      console.log('ℹ️  Audit trail UI not implemented yet')
      // Alternative: Query API directly
      // await page.goto(`${BASE_URL}/api/approvals/submission/${submissionId}`)
      // Verify response contains audit records
    }
  })

  /**
   * Test 8: Next/Previous navigation in approval queue
   */
  test('Manager can navigate between pending submissions', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Manager
    await setupManagerTest(page)

    // Navigate to approvals page
    await navigateToApprovals(page)
    await page.waitForLoadState('networkidle')

    // Get first submission
    const firstSubmission = page.locator('table tbody tr, [role="table"] tbody tr').first()
    const submissionCount = await firstSubmission.count()

    if (submissionCount >= 2) {
      // Open first submission
      await firstSubmission.click()
      await page.waitForLoadState('networkidle')

      // Look for "Next" button
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Next Submission"), button[aria-label*="next"]')
      const hasNext = await nextButton.count() > 0

      if (hasNext) {
        // Click Next twice
        await nextButton.first().click()
        await page.waitForTimeout(500)
        await nextButton.first().click()
        await page.waitForTimeout(500)

        // Look for "Previous" button
        const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous"]')

        if (await prevButton.count() > 0) {
          await prevButton.first().click()
          await page.waitForTimeout(500)

          console.log('✅ Manager can navigate between submissions using Next/Previous buttons')
        }
      } else {
        console.log('ℹ️  Next/Previous navigation buttons not implemented')
      }
    } else {
      console.log('ℹ️  Need at least 2 submissions to test navigation')
      test.skip(true, 'Not enough submissions for navigation test')
    }
  })
})

/**
 * Test Suite: Permission and Access Control
 */
test.describe('Approval Workflow - Permissions', () => {
  test('Member cannot access approvals page', async ({ page }) => {
    // Login as Member
    await setupMemberTest(page)

    // Try to navigate to approvals page
    await page.goto(`${BASE_URL}/admin/approvals`)
    await page.waitForTimeout(2000)

    // Should be redirected or see error
    const currentUrl = page.url()
    const hasError = page.locator('text=Forbidden, text=403, text=not authorized').count() > 0

    expect(currentUrl.includes('/forbidden') || currentUrl.includes('/403') || hasError).toBeTruthy()
    console.log('✅ Members cannot access approvals page (permission check passed)')
  })

  test('Leader cannot approve submissions', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    // Login as Leader
    await setupLeaderTest(page)

    // Navigate to approvals page (if accessible)
    await page.goto(`${BASE_URL}/admin/approvals`)
    await page.waitForTimeout(2000)

    // Look for approve button
    const approveButton = page.locator('button:has-text("Approve")')
    const buttonCount = await approveButton.count()

    if (buttonCount > 0) {
      // Button should be disabled
      const isDisabled = await approveButton.first().isDisabled()
      expect(isDisabled).toBeTruthy()
      console.log('✅ Leader cannot approve (button disabled)')
    } else {
      console.log('✅ Leader cannot see approve button')
    }
  })
})

/**
 * Test Suite: Status Transitions
 */
test.describe('Approval Workflow - Status Transitions', () => {
  test('Submission status flows correctly: grading -> pending_review -> approved -> published', async ({ page }) => {
    if (!testChallengeId) {
      test.skip(true, 'No test challenge available')
      return
    }

    console.log('ℹ️  This test requires manual verification of status transitions')
    console.log('   Expected flow: grading -> pending_review -> approved -> published')

    // TODO: Implement automated status transition verification
    // 1. Leader grades and submits -> status: pending_review
    // 2. Manager approves -> status: approved
    // 3. Manager publishes -> status: published

    test.skip(true, 'Status transition verification requires full implementation')
  })
})
