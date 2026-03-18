/**
 * Auth Fixtures for Manager and Leader Role Testing
 *
 * Provides test user setup and authentication helpers for E2E tests
 * that require Manager, Leader, and Admin roles.
 *
 * Usage:
 *   import { setupManagerTest, setupLeaderTest, setupAdminTest, TestUser } from './fixtures/auth.setup-admin-approver'
 *
 *   test('Manager can approve', async ({ page }) => {
 *     const manager = await setupManagerTest(page)
 *     // ... test code using manager credentials
 *   })
 */

import { Page, BrowserContext } from '@playwright/test'

/**
 * Test user interface with credentials and role information
 */
export interface TestUser {
  email: string
  password: string
  name: string
  role: 'admin' | 'manager' | 'leader' | 'member'
  id?: string
}

/**
 * Test user credentials for different roles
 * These should match users created in the test database
 */
const TEST_USERS = {
  admin: {
    email: 'admin@geniee.co.jp',
    password: 'admin123',
    name: 'Test Admin',
    role: 'admin' as const,
  },
  manager: {
    email: 'manager@geniee.co.jp',
    password: 'manager123',
    name: 'Test Manager',
    role: 'manager' as const,
  },
  leader: {
    email: 'leader@geniee.co.jp',
    password: 'leader123',
    name: 'Test Leader',
    role: 'leader' as const,
  },
  member: {
    email: 'member@geniee.co.jp',
    password: 'member123',
    name: 'Test Member',
    role: 'member' as const,
  },
}

/**
 * Login helper function - performs login using email/password
 * @param page Playwright page instance
 * @param email User email
 * @param password User password
 * @returns Promise that resolves when login is complete
 */
async function performLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  // Navigate to login page
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')

  // Check if we're already logged in (redirected away from login)
  const currentUrl = page.url()
  if (!currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
    // Already authenticated
    return
  }

  // Fill in credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Submit login form
  await Promise.all([
    page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ])

  // Wait for page to stabilize after login
  await page.waitForLoadState('networkidle')
}

/**
 * Setup Manager test user
 * Creates or reuses existing Manager user and performs login
 *
 * @param page Playwright page instance
 * @returns TestUser object with Manager credentials
 */
export async function setupManagerTest(page: Page): Promise<TestUser> {
  const managerUser = TEST_USERS.manager

  try {
    await performLogin(page, managerUser.email, managerUser.password)
    console.log(`✅ Manager login successful: ${managerUser.email}`)
  } catch (error) {
    console.error(`❌ Manager login failed:`, error)
    throw new Error(`Failed to login as Manager: ${error}`)
  }

  return managerUser
}

/**
 * Setup Leader test user
 * Creates or reuses existing Leader user and performs login
 *
 * @param page Playwright page instance
 * @returns TestUser object with Leader credentials
 */
export async function setupLeaderTest(page: Page): Promise<TestUser> {
  const leaderUser = TEST_USERS.leader

  try {
    await performLogin(page, leaderUser.email, leaderUser.password)
    console.log(`✅ Leader login successful: ${leaderUser.email}`)
  } catch (error) {
    console.error(`❌ Leader login failed:`, error)
    throw new Error(`Failed to login as Leader: ${error}`)
  }

  return leaderUser
}

/**
 * Setup Admin test user
 * Creates or reuses existing Admin user and performs login
 *
 * @param page Playwright page instance
 * @returns TestUser object with Admin credentials
 */
export async function setupAdminTest(page: Page): Promise<TestUser> {
  const adminUser = TEST_USERS.admin

  try {
    await performLogin(page, adminUser.email, adminUser.password)
    console.log(`✅ Admin login successful: ${adminUser.email}`)
  } catch (error) {
    console.error(`❌ Admin login failed:`, error)
    throw new Error(`Failed to login as Admin: ${error}`)
  }

  return adminUser
}

/**
 * Setup Member test user
 * Creates or reuses existing Member user and performs login
 *
 * @param page Playwright page instance
 * @returns TestUser object with Member credentials
 */
export async function setupMemberTest(page: Page): Promise<TestUser> {
  const memberUser = TEST_USERS.member

  try {
    await performLogin(page, memberUser.email, memberUser.password)
    console.log(`✅ Member login successful: ${memberUser.email}`)
  } catch (error) {
    console.error(`❌ Member login failed:`, error)
    throw new Error(`Failed to login as Member: ${error}`)
  }

  return memberUser
}

/**
 * Create test users in the database
 * This should be called in test setup (beforeAll) to ensure test users exist
 *
 * Note: This is a placeholder function. In a real implementation,
 * you would call an API endpoint or directly insert into the test database.
 *
 * @returns Promise that resolves when users are created
 */
export async function createTestUsers(): Promise<void> {
  // TODO: Implement user creation logic
  // Options:
  // 1. Call a test-only API endpoint: POST /api/test/create-users
  // 2. Direct database insertion using Supabase admin client
  // 3. Run a database script

  console.log('ℹ️  Test user creation not implemented. Ensure users exist in database:')
  console.log('   - admin@geniee.co.jp (admin role)')
  console.log('   - manager@geniee.co.jp (manager role)')
  console.log('   - leader@geniee.co.jp (leader role)')
  console.log('   - member@geniee.co.jp (member role)')
}

/**
 * Cleanup test users from the database
 * This should be called in test teardown (afterAll) to clean up test data
 *
 * Note: This is a placeholder function. In a real implementation,
 * you would call an API endpoint or directly delete from the test database.
 *
 * @returns Promise that resolves when users are deleted
 */
export async function cleanupTestUsers(): Promise<void> {
  // TODO: Implement user cleanup logic
  // Options:
  // 1. Call a test-only API endpoint: DELETE /api/test/cleanup-users
  // 2. Direct database deletion using Supabase admin client
  // 3. Run a database cleanup script

  console.log('ℹ️  Test user cleanup not implemented.')
}

/**
 * Create test challenge for approval workflow tests
 *
 * @param page Playwright page instance (authenticated as admin)
 * @param challengeName Name for the test challenge
 * @returns Challenge ID
 */
export async function createTestChallenge(
  page: Page,
  challengeName: string = 'Test Approval Challenge'
): Promise<string | null> {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  try {
    await page.goto(`${BASE_URL}/admin/challenges`)
    await page.waitForLoadState('networkidle')

    // Click "Create Challenge" button
    await page.click('button:has-text("Create Challenge"), a:has-text("Create Challenge")')

    // Wait for form to appear
    await page.waitForSelector('input[name="title"], input[placeholder*="title"]', { timeout: 5000 })

    // Fill challenge details
    await page.fill('input[name="title"], input[placeholder*="title"]', challengeName)
    await page.fill('input[name="xp_rewards"], input[placeholder*="xp"]', '100')

    // Set deadline (future date)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    await page.fill('input[type="date"]', deadline.toISOString().split('T')[0])

    // Submit form
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")')

    // Wait for navigation to challenge detail page
    await page.waitForURL(/\/challenges\/[a-z0-9-]+/, { timeout: 10000 })

    // Extract challenge ID from URL
    const url = page.url()
    const match = url.match(/\/challenges\/([a-z0-9-]+)/)
    const challengeId = match ? match[1] : null

    console.log(`✅ Test challenge created: ${challengeId}`)
    return challengeId
  } catch (error) {
    console.error('❌ Failed to create test challenge:', error)
    return null
  }
}

/**
 * Helper to navigate to approvals page
 *
 * @param page Playwright page instance
 */
export async function navigateToApprovals(page: Page): Promise<void> {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
  await page.goto(`${BASE_URL}/admin/approvals`)
  await page.waitForLoadState('networkidle')
}

/**
 * Helper to navigate to grading page
 *
 * @param page Playwright page instance
 * @param challengeId Challenge ID
 */
export async function navigateToGrading(page: Page, challengeId: string): Promise<void> {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
  await page.goto(`${BASE_URL}/admin/challenges/${challengeId}/grading`)
  await page.waitForLoadState('networkidle')
}
