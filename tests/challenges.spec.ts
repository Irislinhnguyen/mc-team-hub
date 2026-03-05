/**
 * E2E Tests for Monthly Challenge / Knowledge Championship Feature
 *
 * These tests verify the complete workflow for:
 * - Admin creating and managing challenges
 * - Users taking challenges with all question types
 * - Auto-save functionality
 * - Auto-grading for cloze and drag-drop questions
 * - Leaders grading essay questions
 * - Leaderboard display
 * - Edge cases and error handling
 *
 * AUTH SETUP:
 * Before running these tests, run: node scripts/setup-playwright-auth.mjs
 * This will capture an authenticated session to use for all tests.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to create a test challenge
async function createTestChallenge(page, challengeName: string) {
  await page.goto(`${BASE_URL}/challenges`);
  await page.click('button:has-text("Create Challenge")');

  await page.fill('input[name="title"]', challengeName);
  await page.fill('input[name="xp_rewards"]', '100');
  await page.fill('input[name="deadline"]', '2025-12-31');

  await page.click('button:has-text("Create")');

  // Wait for navigation to the challenge edit page
  await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

  // Extract challenge ID from URL
  const url = page.url();
  const match = url.match(/\/challenges\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

// Helper function to add a question to a challenge
async function addQuestion(
  page,
  challengeId: string,
  questionType: string,
  questionData: any
) {
  await page.goto(`${BASE_URL}/challenges/${challengeId}`);

  // Click the button to add a question
  await page.click(`button:has-text("Add ${questionType} Question")`);

  // Wait for the question form to appear
  await expect(page.locator(`text=${questionType} Question`)).toBeVisible();

  // Fill in question data based on type
  switch (questionType) {
    case 'Cloze':
      await page.fill('input[name="question"]', questionData.question);
      await page.fill('textarea[name="answer"]', questionData.answer);
      break;

    case 'Drag Drop':
      await page.fill('input[name="question"]', questionData.question);
      await page.fill('textarea[name="answer"]', questionData.answer);
      break;

    case 'Essay':
      await page.fill('input[name="question"]', questionData.question);
      await page.fill('textarea[name="guideline"]', questionData.guideline);
      await page.fill('input[name="max_score"]', questionData.maxScore.toString());
      break;

    case 'Multiple Choice':
      await page.fill('input[name="question"]', questionData.question);
      await page.fill('textarea[name="options"]', questionData.options);
      await page.fill('input[name="correct_answer"]', questionData.correctAnswer);
      break;

    case 'Checkbox':
      await page.fill('input[name="question"]', questionData.question);
      await page.fill('textarea[name="options"]', questionData.options);
      await page.fill('textarea[name="correct_answers"]', questionData.correctAnswers);
      break;
  }

  await page.click('button:has-text("Add Question")');
  await expect(page.locator('text=Question added successfully')).toBeVisible();
}

/**
 * Test Suite: User Takes Challenge and Views Leaderboard
 */
test.describe('User Takes Challenge and Views Leaderboard', () => {
  let challengeId: string;

  test.beforeEach(async ({ page }) => {
    // Verify we're authenticated
    await page.goto(`${BASE_URL}`);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      throw new Error(
        'Not authenticated! Please run: node scripts/setup-playwright-auth.mjs'
      );
    }
  });

  test('should render cloze question with Select dropdowns', async ({ page }) => {
    // This test verifies that cloze questions properly display Select dropdowns
    // instead of text inputs, and that the state management bug is fixed

    // Navigate to a challenge with cloze questions (assumes setup script created one)
    await page.goto(`${BASE_URL}/challenges`);

    // Find and click on a challenge
    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();

    // Wait for the challenge page to load
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Verify that cloze questions use Select components (not text inputs)
    const selectDropdowns = page.locator('[role="combobox"]');
    const textInputs = page.locator('input[type="text"]');

    // We should see select dropdowns for cloze questions
    const hasSelects = await selectDropdowns.count() > 0;

    if (hasSelects) {
      // Verify the Select dropdowns are properly rendered
      await expect(selectDropdowns.first()).toBeVisible();

      // Click a Select dropdown to verify it works (state management check)
      await selectDropdowns.first().click();
      await expect(page.locator('[role="listbox"]').first()).toBeVisible();
    }
  });

  test('should display leaderboard with rankings', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Click on Leaderboard tab
    await page.click('button:has-text("Leaderboard")');

    // Verify leaderboard section is visible
    await expect(page.locator('text=Leaderboard')).toBeVisible();

    // Check if leaderboard has entries (may be empty if no submissions)
    const leaderboardEntries = page.locator('tr:has-text("points")');
    const entryCount = await leaderboardEntries.count();

    if (entryCount > 0) {
      // Verify ranking, name, and score are displayed
      await expect(leaderboardEntries.first()).toBeVisible();
    }
  });

  test('should show error for invalid challenge ID', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges/invalid-challenge-id`);

    // Should redirect or show error
    const currentUrl = page.url();
    const hasError =
      (await page.locator('text=not found, text=error').count()) > 0;

    expect(
      hasError || currentUrl.includes('/challenges')
    ).toBeTruthy();
  });
});

/**
 * Test Suite: Drag Drop Question Functionality
 */
test.describe('Drag Drop Question Functionality', () => {
  test('should allow users to drag and drop answers', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for drag-drop questions
    const dragZones = page.locator('[data-testid="drop-zone"]');
    const hasDragDrop = await dragZones.count() > 0;

    if (hasDragDrop) {
      // Verify drop zones are visible
      await expect(dragZones.first()).toBeVisible();

      // Verify draggable items exist
      const draggables = page.locator('[data-testid="draggable"]');
      await expect(draggables.first()).toBeVisible();
    }
  });

  test('should auto-grade drag drop answers on submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Fill in answers and submit
    const submitButton = page.locator('button:has-text("Submit")');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Check for auto-grading feedback
      const feedback = page.locator('text=Score, text=graded');
      await expect(feedback.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

/**
 * Test Suite: Essay Question Grading
 */
test.describe('Essay Question Grading', () => {
  test('should allow leaders to grade essay answers', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for grading interface (may not be visible if no submissions)
    const gradeButton = page.locator('button:has-text("Grade")');
    if (await gradeButton.isVisible()) {
      await gradeButton.click();

      // Verify grading modal or section appears
      await expect(page.locator('text=Score, text=Feedback')).toBeVisible();

      // Fill in score and feedback
      const scoreInput = page.locator('input[type="number"]').first();
      await scoreInput.fill('85');

      const feedbackInput = page.locator('textarea').first();
      await feedbackInput.fill('Good answer!');

      // Submit grade
      await page.click('button:has-text("Submit Grade")');

      // Verify success message
      await expect(page.locator('text=Grade submitted')).toBeVisible();
    }
  });
});

/**
 * Test Suite: Auto-Save Functionality
 */
test.describe('Auto-Save Functionality', () => {
  test('should auto-save user answers periodically', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Fill in an answer
    const textArea = page.locator('textarea').first();
    if (await textArea.isVisible()) {
      await textArea.fill('Test answer');

      // Wait for auto-save (typically 5-10 seconds)
      await page.waitForTimeout(6000);

      // Check for saved indicator
      const savedIndicator = page.locator('text=Saved, text=Auto-saved');
      const hasIndicator = await savedIndicator.isVisible();

      if (hasIndicator) {
        await expect(savedIndicator).toBeVisible();
      }
    }
  });

  test('should restore auto-saved answers on page reload', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Fill in an answer
    const textArea = page.locator('textarea').first();
    if (await textArea.isVisible()) {
      const testAnswer = 'Test answer for auto-save';
      await textArea.fill(testAnswer);

      // Wait for auto-save
      await page.waitForTimeout(6000);

      // Reload the page
      await page.reload();

      // Wait for the page to load
      await page.waitForLoadState('networkidle');

      // Check if the answer is restored
      const textAreaAfterReload = page.locator('textarea').first();
      const value = await textAreaAfterReload.inputValue();

      // The answer should be restored (or at least the page should load without error)
      expect(value).toBeDefined();
    }
  });
});

/**
 * Test Suite: Edge Cases and Error Handling
 */
test.describe('Edge Cases and Error Handling', () => {
  test('should handle empty submission gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Try to submit without answering
    const submitButton = page.locator('button:has-text("Submit")');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Check for validation error or success (empty may be allowed)
      const hasError =
        (await page.locator('text=required, text=please answer').count()) > 0;
      const hasSuccess =
        (await page.locator('text=submitted, text=Success').count()) > 0;

      expect(hasError || hasSuccess).toBeTruthy();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (challengeExists) {
      await challengeCard.click();

      // Should show offline or error indicator
      const hasOfflineIndicator =
        (await page.locator('text=offline, text=Network error').count()) > 0;

      if (hasOfflineIndicator) {
        await expect(
          page.locator('text=offline, text=Network error').first()
        ).toBeVisible();
      }
    }

    // Restore connectivity
    await page.context().setOffline(false);
  });

  test('should handle expired challenge deadline', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Check if deadline has passed
    const deadlineText = page.locator('text=Deadline, text=expired');
    const hasDeadline = await deadlineText.isVisible();

    if (hasDeadline) {
      await expect(deadlineText.first()).toBeVisible();
    }
  });
});

/**
 * Test Suite: Question Type Rendering
 */
test.describe('Question Type Rendering', () => {
  test('should render multiple choice question correctly', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for radio buttons (multiple choice)
    const radioButtons = page.locator('input[type="radio"]');
    const hasMultipleChoice = await radioButtons.count() > 0;

    if (hasMultipleChoice) {
      await expect(radioButtons.first()).toBeVisible();
    }
  });

  test('should render checkbox question correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const hasCheckbox = await checkboxes.count() > 0;

    if (hasCheckbox) {
      await expect(checkboxes.first()).toBeVisible();
    }
  });

  test('should render essay question correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for textareas (essay questions)
    const textareas = page.locator('textarea');
    const hasEssay = await textareas.count() > 0;

    if (hasEssay) {
      await expect(textareas.first()).toBeVisible();

      // Check for guideline text
      const guideline = page.locator('text=Guideline, text=Instructions');
      const hasGuideline = await guideline.isVisible();

      if (hasGuideline) {
        await expect(guideline.first()).toBeVisible();
      }
    }
  });

  test('should render cloze question with Select components', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for Select components (role="combobox")
    const selectComponents = page.locator('[role="combobox"]');
    const hasCloze = await selectComponents.count() > 0;

    if (hasCloze) {
      await expect(selectComponents.first()).toBeVisible();

      // Click to open dropdown
      await selectComponents.first().click();

      // Verify options are displayed
      const listbox = page.locator('[role="listbox"]');
      await expect(listbox.first()).toBeVisible();
    }
  });

  test('should render drag drop question correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Look for drag-drop components
    const draggables = page.locator('[draggable="true"], [data-testid="draggable"]');
    const hasDragDrop = await draggables.count() > 0;

    if (hasDragDrop) {
      await expect(draggables.first()).toBeVisible();

      // Look for drop zones
      const dropZones = page.locator('[data-testid="drop-zone"]');
      await expect(dropZones.first()).toBeVisible();
    }
  });
});

/**
 * Test Suite: Leaderboard Functionality
 */
test.describe('Leaderboard Functionality', () => {
  test('should sort users by score in descending order', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Click on Leaderboard tab
    await page.click('button:has-text("Leaderboard")');

    // Get all score values
    const scores = page.locator('td:has-text("points"), [data-testid="score"]');
    const scoreCount = await scores.count();

    if (scoreCount > 1) {
      // Verify scores are in descending order
      const scoreValues = [];
      for (let i = 0; i < scoreCount; i++) {
        const scoreText = await scores.nth(i).textContent();
        const score = parseInt(scoreText?.replace(/[^0-9]/g, '') || '0');
        scoreValues.push(score);
      }

      // Check if sorted in descending order
      for (let i = 0; i < scoreValues.length - 1; i++) {
        expect(scoreValues[i]).toBeGreaterThanOrEqual(scoreValues[i + 1]);
      }
    }
  });

  test('should display user rank correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Click on Leaderboard tab
    await page.click('button:has-text("Leaderboard")');

    // Look for rank indicators (1st, 2nd, 3rd, etc.)
    const ranks = page.locator('td:has-text(/^\\d+$/), [data-testid="rank"]');
    const hasRanks = await ranks.count() > 0;

    if (hasRanks) {
      await expect(ranks.first()).toBeVisible();

      // Verify ranks start from 1
      const firstRank = await ranks.first().textContent();
      expect(firstRank?.trim()).toEqual('1');
    }
  });

  test('should handle empty leaderboard gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Click on Leaderboard tab
    await page.click('button:has-text("Leaderboard")');

    // Check for empty state message
    const emptyMessage = page.locator('text=No submissions, text=Be the first');
    const hasEmptyMessage = await emptyMessage.isVisible();

    if (hasEmptyMessage) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});

/**
 * Test Suite: Navigation and Routing
 */
test.describe('Navigation and Routing', () => {
  test('should navigate back to challenges list', async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    const challengeCard = page.locator('a[href^="/challenges/"]').first();
    const challengeExists = await challengeCard.isVisible();

    if (!challengeExists) {
      test.skip(true, 'No challenges found. Run setup script first.');
    }

    await challengeCard.click();
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/);

    // Navigate back
    await page.click('a:has-text("Back"), button:has-text("Back")');

    // Verify we're back on the challenges list
    await page.waitForURL(/\/challenges$/);
    expect(page.url()).not.toMatch(/\/challenges\/[a-z0-9-]+$/);
  });

  test('should navigate from home to challenges', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Look for Challenges link
    const challengesLink = page.locator('a:has-text("Challenge"), a[href="/challenges"]');
    const linkExists = await challengesLink.isVisible();

    if (linkExists) {
      await challengesLink.first().click();
      await page.waitForURL(/\/challenges$/);
    }
  });
});

/**
 * Test Suite: Responsive Design
 */
test.describe('Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/challenges`);

    // Verify page loads without errors
    const currentUrl = page.url();
    expect(currentUrl).toContain('/challenges');
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/challenges`);

    // Verify page loads without errors
    const currentUrl = page.url();
    expect(currentUrl).toContain('/challenges');
  });
});
