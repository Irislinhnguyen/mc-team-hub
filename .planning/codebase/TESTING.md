# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Runner:**
- Framework: Playwright
- Version: 1.58.2
- Config: `playwright.config.mjs`
- Type: End-to-end testing

**Assertion Library:**
- Built into Playwright (expect)

**Run Commands:**
```bash
npm test                    # Run all tests
npm run test:ui             # Run in UI mode
npm run test:headed        # Run with visible browser
```

## Test File Organization

**Location:**
- Root: `/tests/` directory
- Co-located with source files: No (all tests in `/tests/`)

**Naming:**
- Pattern: `[feature].spec.ts`
- Example: `challenges.spec.ts`, `auth-setup.spec.ts`

**Structure:**
```
tests/
├── auth/
│   ├── setup.ts          # Authentication setup script
│   ├── auth.json         # Saved auth state (generated)
│   ├── setup-admin.spec.ts # Admin login test
│   └── ...
├── challenges.spec.ts     # Challenge feature tests
├── sales-lists.spec.ts   # Sales list tests
├── admin-login.spec.ts   # Admin login tests
└── ...
```

## Test Structure

**Suite Organization:**
```typescript
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
 */
import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function
async function createTestChallenge(page, challengeName: string) {
  // Implementation
}

test.describe('Test Suite Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for each test
  });

  test('should test specific functionality', async ({ page }) => {
    // Test implementation
  });
});
```

**Patterns:**
- Setup/teardown with `beforeEach` and `afterEach`
- Test groups using `test.describe`
- Helper functions for common test operations
- Authentication state reuse via saved auth.json

## Mocking

**Framework:** No dedicated mocking framework (Playwright handles browser mocking)

**Patterns:**
```typescript
// Network request interception
await page.route('**/api/**', route => {
  if (route.request().url().includes('/slow-endpoint')) {
    route.abort()
  } else {
    route.continue()
  }
})

// Mock API responses
await page.route('**/api/sessions', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockSessions)
  })
})
```

**What to Mock:**
- Network requests for slow APIs
- Authentication failures
- External service dependencies

**What NOT to Mock:**
- Frontend state management
- UI component interactions
- Browser APIs (use Playwright's built-in mocking)

## Fixtures and Factories

**Test Data:**
```typescript
// Challenge data factory
const createChallengeData = (overrides = {}) => ({
  title: 'Test Challenge',
  xp_rewards: 100,
  deadline: '2025-12-31',
  ...overrides
})

// User data factory
const createUserData = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  ...overrides
})
```

**Location:**
- Test files for small fixtures
- Separate factory files for complex data (not used in current codebase)
- Auth state stored in `tests/auth/auth.json`

## Coverage

**Requirements:** Not enforced by Playwright
- Coverage handled by Istanbul/nyc for unit tests
- Playwright focuses on behavioral coverage

**View Coverage:**
```bash
# No coverage command for Playwright
# Use Istanbul for unit test coverage if added
```

## Test Types

**Unit Tests:**
- Not currently implemented
- Would use Jest or Vitest
- For individual functions and utilities

**Integration Tests:**
- API route testing via Playwright
- Database integration via Supabase client
- Cross-component interactions

**E2E Tests:**
- Full user workflows
- Authentication flows
- Form submissions
- Navigation between pages
- Error handling scenarios
- Responsive design testing

## Common Patterns

**Async Testing:**
```typescript
test('should handle async operations', async ({ page }) => {
  await page.fill('input[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')

  // Wait for async operation to complete
  await expect(page.locator('text=Success')).toBeVisible({ timeout: 10000 })
})
```

**Error Testing:**
```typescript
test('should show error for invalid input', async ({ page }) => {
  await page.fill('input[name="email"]', 'invalid-email')
  await page.click('button[type="submit"]')

  await expect(page.locator('text=Please enter a valid email')).toBeVisible()
})
```

**Authentication Testing:**
```typescript
test('should require authentication for protected routes', async ({ page }) => {
  await page.goto('/analytics')
  await expect(page.url()).toContain('/auth')
})
```

**Page Object Pattern:**
```typescript
// pages/auth.ts
export class AuthPage {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
  }

  async getErrorMessage(): Promise<string> {
    return this.page.locator('.error-message').textContent()
  }
}
```

**Test Data Management:**
- Use test environment database (Supabase)
- Isolate test data between tests
- Clean up after tests when possible
- Use unique test data identifiers

**Accessibility Testing:**
```typescript
test('should be accessible', async ({ page }) => {
  // Basic accessibility checks
  const accessibilityIssues = await page.accessibility violations()
  expect(accessibilityIssues).toEqual([])
})
```

**Performance Testing:**
```typescript
test('should load within acceptable time', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(3000)
})
```

---

*Testing analysis: 2026-03-18*