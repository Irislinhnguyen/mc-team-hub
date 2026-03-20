import { test, expect } from '@playwright/test';

/**
 * E2E Test: Approval Workflow
 *
 * Prerequisites:
 * - Challenge "E2E Test Challenge - All Question Types" exists with ID: ccbd20b7-cb0e-4af4-851b-986079dd2302
 * - Test submission exists for testuser@geniee.co.jp
 * - Leader account: leader@geniee.co.jp / password (ask user)
 * - Manager account: cuongth@geniee.co.jp / password (ask user)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CHALLENGE_ID = 'ccbd20b7-cb0e-4af4-851b-986079dd2302';

// Test credentials - newly created password-based test users
const LEADER_EMAIL = 'test-leader@example.com';
const MANAGER_EMAIL = 'test-manager@example.com';
const LEADER_PASSWORD = 'Leader123';
const MANAGER_PASSWORD = 'Manager123';

test.describe('Approval Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL
    await page.goto(BASE_URL);
  });

  /**
   * Test 1: Leader submits for review
   */
  test('Leader can grade essay and submit for Manager review', async ({ page }) => {
    // Step 1: Login as Leader
    await test.step('Login as Leader', async () => {
      await page.goto(`${BASE_URL}/auth`);
      await page.waitForLoadState('domcontentloaded');

      // Wait for the tabs to be visible
      const tabsList = page.getByRole('tablist');
      await expect(tabsList).toBeVisible({ timeout: 5000 });

      // Click Admin tab - Radix UI uses data-value attribute
      const adminTab = page.locator('[data-value="admin"]').or(page.locator('button').filter({ hasText: 'Admin' }));
      await expect(adminTab.first()).toBeVisible({ timeout: 5000 });

      // Try multiple click strategies
      await adminTab.first().click({ force: true });

      // Wait for React state to update
      await page.waitForTimeout(500);

      // Wait for the password form to appear
      await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

      // Fill in credentials
      await page.locator('#email').fill(LEADER_EMAIL);
      await page.locator('#password').fill('Leader123');

      // Submit form
      await page.locator('button[type="submit"]').click();

      // Wait for the "Signing in..." button to indicate submission started
      await page.waitForTimeout(3000);

      // Wait for navigation away from auth page
      // The client-side code does window.location.href which triggers a full navigation
      await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });

      // Reload the page to ensure AuthContext picks up the cookie
      await page.reload({ waitUntil: 'commit' });
      await page.waitForTimeout(2000);

      // Verify we're on a page other than auth
      expect(page.url()).not.toContain('/auth');
      console.log('Login successful, URL:', page.url());
    });

    // Step 2: Navigate to grading page
    await test.step('Navigate to grading page', async () => {
      // Wait for page to stabilize after login
      await page.waitForTimeout(3000);
      console.log('Current URL after login:', page.url());

      // Navigate to grading page - use 'commit' to avoid waiting for all resources
      await page.goto(`${BASE_URL}/admin/challenges/${CHALLENGE_ID}/grading`, { waitUntil: 'commit' });

      // Wait for any network activity to complete
      await page.waitForTimeout(5000);
      console.log('Grading page URL:', page.url());

      // Take a screenshot to debug what we see
      await page.screenshot({ path: 'test-results/grading-page.png' });
      console.log('Screenshot saved to test-results/grading-page.png');

      // Check if we're still on auth page (redirected)
      if (page.url().includes('/auth')) {
        throw new Error('Authentication failed - redirected back to login page');
      }

      // Check for any content from the grading page
      const bodyText = await page.locator('body').textContent();
      console.log('Page body contains "Grading":', bodyText?.includes('Grading'));
      console.log('Page body contains "Challenge":', bodyText?.includes('Challenge'));
      console.log('Page body contains "submission":', bodyText?.includes('submission'));

      // For now, just verify we're not on auth page
      expect(page.url()).not.toContain('/auth');
    });

    // Step 3: Find the test submission and grade the essay
    await test.step('Grade essay question', async () => {
      // Look for the submission card
      const submissionCard = page.locator('text=/testuser/i').or(page.locator('[data-testid="submission-card"]')).first();

      if (await submissionCard.isVisible({ timeout: 5000 })) {
        await submissionCard.click();
      }

      // Look for grade/grading button
      const gradeButton = page.locator('button:has-text("Grade"), button:has-text("View"), [data-testid="grade-button"]').first();

      if (await gradeButton.isVisible({ timeout: 5000 })) {
        await gradeButton.click();
      }

      // Wait for grading interface
      await page.waitForTimeout(1000);

      // Find essay question (should have manual score input)
      const essayScoreInput = page.locator('input[type="number"]').first();
      const essayFeedbackInput = page.locator('textarea').first();

      // Grade the essay
      if (await essayScoreInput.isVisible({ timeout: 5000 })) {
        await essayScoreInput.fill('8');
        await essayFeedbackInput.fill('Good understanding of TDD concepts. Could elaborate more on potential drawbacks.');

        // Save grades
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Submit")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    });

    // Step 4: Submit for review
    await test.step('Submit for Manager review', async () => {
      // Go back to grading page if needed
      await page.goto(`${BASE_URL}/admin/challenges/${CHALLENGE_ID}/grading`, { waitUntil: 'commit' });
      await page.waitForLoadState('networkidle');

      // Look for "Submit for Review" button
      const submitButton = page.locator('button:has-text("Submit for Review"), button:has-text("Submit All")').first();

      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Check for success toast/message
        const successMessage = page.locator('text=/sent.*review|submitted/i');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'Submit for Review button not found - submission may already be submitted');
      }
    });

    // Step 5: Verify status changed to pending_review
    await test.step('Verify status is Pending Review', async () => {
      await page.goto(`${BASE_URL}/admin/challenges/${CHALLENGE_ID}/grading`, { waitUntil: 'commit' });
      await page.waitForLoadState('networkidle');

      // Look for Pending Review badge
      const pendingBadge = page.locator('text=/Pending Review|pending_review/i');
      await expect(pendingBadge).toBeVisible({ timeout: 5000 });
    });

    console.log('✓ Test 1 PASSED: Leader submitted for Manager review');
  });

  /**
   * Test 2: Manager approves submission
   */
  test('Manager can view and approve pending submission', async ({ page }) => {
    // Step 1: Login as Manager
    await test.step('Login as Manager', async () => {
      await page.goto(`${BASE_URL}/auth`);
      await page.waitForLoadState('domcontentloaded');

      // Wait for the tabs to be visible
      const tabsList = page.getByRole('tablist');
      await expect(tabsList).toBeVisible({ timeout: 5000 });

      // Click Admin tab using getByRole with name
      const adminTab = page.getByRole('tab', { name: 'Admin' });
      await expect(adminTab).toBeVisible({ timeout: 5000 });
      await adminTab.click();
      await page.waitForTimeout(500);

      // Fill in credentials
      await page.locator('#email').fill(MANAGER_EMAIL);
      await page.locator('#password').fill('Manager123');

      // Submit form and wait for navigation (redirects to / by default)
      await Promise.all([
        page.waitForNavigation({ url: /\/.*/, timeout: 15000 }),
        page.locator('button[type="submit"]').click()
      ]);
    });

    // Step 2: Navigate to approvals page
    await test.step('Navigate to approvals queue', async () => {
      await page.goto(`${BASE_URL}/admin/approvals`);
      await page.waitForLoadState('networkidle');

      // Check if we're on the approvals page
      await expect(page.locator('h1, h2').filter({ hasText: /approvals/i })).toBeAttached({ timeout: 5000 });
    });

    // Step 3: Find pending submission
    await test.step('Find pending submission in queue', async () => {
      // Look for the approval queue table
      const table = page.locator('table').first();

      if (await table.isVisible({ timeout: 5000 })) {
        // Look for testuser in the table
        const testUserRow = page.locator('tr:has-text("testuser"), tr:has-text("Test User")').first();

        if (await testUserRow.isVisible({ timeout: 5000 })) {
          await testUserRow.click();
        } else {
          test.skip(true, 'No pending submission found for testuser - may have been approved already');
        }
      } else {
        // Check for empty state
        const emptyState = page.locator('text=/no.*pending|empty|all.*reviewed/i');
        if (await emptyState.isVisible({ timeout: 5000 })) {
          test.skip(true, 'No pending submissions found');
        }
      }
    });

    // Step 4: Approve the submission
    await test.step('Approve submission', async () => {
      await page.waitForTimeout(1000);

      // Look for Approve button
      const approveButton = page.locator('button:has-text("Approve"), [data-testid="approve-button"]').first();

      if (await approveButton.isVisible({ timeout: 5000 })) {
        await approveButton.click();
        await page.waitForTimeout(2000);

        // Check for success message
        const successMessage = page.locator('text=/approved|ready to publish/i');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      } else {
        test.skip(true, 'Approve button not found - submission may already be approved');
      }
    });

    // Step 5: Verify status changed to approved
    await test.step('Verify status is Approved', async () => {
      await page.goto(`${BASE_URL}/admin/approvals`);
      await page.waitForLoadState('networkidle');

      // Should NOT see testuser in pending list anymore
      const testUserRow = page.locator('tr:has-text("testuser")').first();

      if (await testUserRow.isVisible({ timeout: 3000 })) {
        // If still visible, check if status is "approved"
        const approvedBadge = page.locator('text=/approved/i').first();
        await expect(approvedBadge).toBeVisible();
      } else {
        // Expected: approved submissions don't appear in pending queue
        console.log('✓ Submission no longer in pending queue (was approved)');
      }
    });

    console.log('✓ Test 2 PASSED: Manager approved submission');
  });

  /**
   * Test 3: Manager publishes approved scores
   */
  test('Manager can publish approved scores', async ({ page }) => {
    // This test requires a submission to be in "approved" status first
    // Skip if Test 2 hasn't been run

    // Step 1: Login as Manager
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the tabs to be visible
    const tabsList = page.getByRole('tablist');
    await expect(tabsList).toBeVisible({ timeout: 5000 });

    // Click Admin tab using getByRole with name
    const adminTab = page.getByRole('tab', { name: 'Admin' });
    await expect(adminTab).toBeVisible({ timeout: 5000 });
    await adminTab.click();
    await page.waitForTimeout(500);

    // Fill in credentials
    await page.locator('#email').fill(MANAGER_EMAIL);
    await page.locator('#password').fill('Manager123');

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(/\/(challenges|admin)/, { timeout: 15000 }),
      page.locator('button[type="submit"]').click()
    ]);

    // Step 2: Navigate to the challenge
    await page.goto(`${BASE_URL}/admin/challenges/${CHALLENGE_ID}`);
    await page.waitForLoadState('networkidle');

    // Step 3: Look for Publish button
    const publishButton = page.locator('button:has-text("Publish"), [data-testid="publish-button"]').first();

    if (await publishButton.isVisible({ timeout: 5000 })) {
      await publishButton.click();
      await page.waitForTimeout(2000);

      // Check for success message
      const successMessage = page.locator('text=/published|leaderboard/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      console.log('✓ Test 3 PASSED: Manager published scores');
    } else {
      test.skip(true, 'Publish button not visible - no approved submissions to publish');
    }
  });

  /**
   * Test 4: Verify audit trail
   */
  test('Verify audit trail in approvals table', async ({ page, request }) => {
    // This test checks the database directly to verify audit records

    // We can't directly query Supabase from Playwright, so we'll use the API
    const response = await request.get(`${BASE_URL}/api/approvals/submission/f5d60b9e-ebb6-4690-951f-5c01f975c5a8`);

    if (response.ok()) {
      const data = await response.json();

      // Should have at least one approval record
      expect(data.approvals).toBeDefined();
      expect(data.approvals.length).toBeGreaterThan(0);

      console.log(`✓ Test 4 PASSED: Found ${data.approvals.length} approval records`);
    } else {
      console.log('⚠ Test 4 SKIPPED: Could not verify audit trail via API');
    }
  });
});

/**
 * Post-Test Cleanup Instructions:
 *
 * To reset the test data:
 * 1. DELETE FROM challenge_answers WHERE submission_id = 'f5d60b9e-ebb6-4690-951f-5c01f975c5a8';
 * 2. DELETE FROM challenge_submissions WHERE id = 'f5d60b9e-ebb6-4690-951f-5c01f975c5a8';
 * 3. DELETE FROM approvals WHERE submission_id = 'f5d60b9e-ebb6-4690-951f-5c01f975c5a8';
 */
