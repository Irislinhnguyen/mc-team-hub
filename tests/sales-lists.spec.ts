import { test, expect } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Helper to login (adjust based on your auth)
async function login(page) {
  // TODO: Adjust this based on your actual login flow
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('Sales Lists Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.describe('List Overview Page', () => {
    test('should display sales lists page', async ({ page }) => {
      await page.goto(`${BASE_URL}/sales-lists`)

      // Check page title
      await expect(page.locator('h1')).toContainText('My Sales Lists')

      // Check navigation shows Sales Lists
      await expect(page.locator('nav')).toContainText('Sales Lists')
    })

    test('should show empty state when no lists exist', async ({ page }) => {
      await page.goto(`${BASE_URL}/sales-lists`)

      // Should show empty state (if no lists)
      const emptyState = page.locator('text=No lists yet')
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
        await expect(page.locator('text=Get started by creating')).toBeVisible()
      }
    })

    test('should open create list modal', async ({ page }) => {
      await page.goto(`${BASE_URL}/sales-lists`)

      // Click New List button
      await page.click('button:has-text("New List")')

      // Modal should open
      await expect(page.locator('text=Create Sales List')).toBeVisible()
      await expect(page.locator('input[id="name"]')).toBeVisible()
    })

    test('should create a new list', async ({ page }) => {
      await page.goto(`${BASE_URL}/sales-lists`)

      // Open modal
      await page.click('button:has-text("New List")')

      // Fill form
      const listName = `Test List ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.fill('textarea[id="description"]', 'Test description')

      // Select a color (click second color)
      await page.click('button[type="button"]:has([style*="background-color"])').nth(1)

      // Submit
      await page.click('button[type="submit"]:has-text("Create List")')

      // Should show success toast
      await expect(page.locator('text=List created successfully')).toBeVisible()

      // List should appear
      await expect(page.locator(`text=${listName}`)).toBeVisible()
    })

    test('should search lists', async ({ page }) => {
      await page.goto(`${BASE_URL}/sales-lists`)

      // Wait for lists to load
      await page.waitForTimeout(1000)

      // Type in search
      await page.fill('input[placeholder*="Search"]', 'Test')

      // Should filter results (if any lists exist)
      await page.waitForTimeout(500)
    })
  })

  test.describe('List Detail Page', () => {
    let listName: string

    test.beforeEach(async ({ page }) => {
      // Create a list first
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      listName = `E2E Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      // Click on the list
      await page.click(`text=${listName}`)
      await page.waitForURL(/\/sales-lists\/[a-f0-9-]+/)
    })

    test('should display list detail page', async ({ page }) => {
      // Check header
      await expect(page.locator(`h1:has-text("${listName}")`)).toBeVisible()

      // Check stats cards
      await expect(page.locator('text=Total Items')).toBeVisible()
      await expect(page.locator('text=Total Contacts')).toBeVisible()
      await expect(page.locator('text=Closed Won')).toBeVisible()
      await expect(page.locator('text=Retargets')).toBeVisible()
    })

    test('should show empty state for items', async ({ page }) => {
      // Should show empty state
      await expect(page.locator('text=No items yet')).toBeVisible()
      await expect(page.locator('text=Add items to start tracking')).toBeVisible()
    })

    test('should open add item modal', async ({ page }) => {
      // Click Add Items
      await page.click('button:has-text("Add Items")')

      // Modal should open
      await expect(page.locator('text=Add Item Manually')).toBeVisible()
      await expect(page.locator('select[id="itemType"]')).toBeVisible()
    })

    test('should add a manual item', async ({ page }) => {
      // Click Add Items
      await page.click('button:has-text("Add Items")')

      // Fill form
      await page.selectOption('select[id="itemType"]', 'domain_app_id')
      await page.fill('input[id="itemValue"]', 'com.example.test')
      await page.fill('input[id="itemLabel"]', 'Test App')
      await page.fill('textarea[id="notes"]', 'Test item for E2E')

      // Submit
      await page.click('button[type="submit"]:has-text("Add Item")')

      // Should show success
      await expect(page.locator('text=Item added successfully')).toBeVisible()

      // Item should appear in table
      await expect(page.locator('text=Test App')).toBeVisible()
      await expect(page.locator('text=com.example.test')).toBeVisible()
    })

    test('should open edit list modal', async ({ page }) => {
      // Click menu
      await page.click('button:has([class*="MoreVertical"])')

      // Click Edit
      await page.click('button:has-text("Edit List")')

      // Modal should open
      await expect(page.locator('text=Edit List')).toBeVisible()
      await expect(page.locator(`input[value="${listName}"]`)).toBeVisible()
    })

    test('should edit list', async ({ page }) => {
      // Click menu
      await page.click('button:has([class*="MoreVertical"])')
      await page.click('button:has-text("Edit List")')

      // Update name
      const newName = `${listName} Updated`
      await page.fill('input[id="name"]', newName)

      // Submit
      await page.click('button[type="submit"]:has-text("Save Changes")')

      // Should show success
      await expect(page.locator('text=List updated successfully')).toBeVisible()

      // Name should update
      await expect(page.locator(`h1:has-text("${newName}")`)).toBeVisible()
    })

    test('should delete list', async ({ page }) => {
      // Click menu
      await page.click('button:has([class*="MoreVertical"])')

      // Click Delete
      await page.click('button:has-text("Delete List")')

      // Confirmation dialog should open
      await expect(page.locator('text=Delete List')).toBeVisible()
      await expect(page.locator('text=This action cannot be undone')).toBeVisible()

      // Confirm delete
      await page.click('button:has-text("Delete List")')

      // Should redirect to overview
      await page.waitForURL(`${BASE_URL}/sales-lists`)

      // Should show success
      await expect(page.locator('text=List deleted successfully')).toBeVisible()
    })
  })

  test.describe('Activity Logging', () => {
    let listName: string

    test.beforeEach(async ({ page }) => {
      // Create list and add item
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      listName = `Activity Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      await page.click(`text=${listName}`)
      await page.waitForURL(/\/sales-lists\/[a-f0-9-]+/)

      // Add item
      await page.click('button:has-text("Add Items")')
      await page.fill('input[id="itemValue"]', 'test.com')
      await page.fill('input[id="itemLabel"]', 'Test Publisher')
      await page.click('button[type="submit"]:has-text("Add Item")')
      await page.waitForTimeout(1000)
    })

    test('should open item detail drawer', async ({ page }) => {
      // Click on item row
      await page.click('text=Test Publisher')

      // Drawer should open
      await expect(page.locator('text=Activity Timeline')).toBeVisible()
      await expect(page.locator('button:has-text("Log Activity")')).toBeVisible()
    })

    test('should log a contact activity', async ({ page }) => {
      // Open drawer
      await page.click('text=Test Publisher')

      // Click Log Activity
      await page.click('button:has-text("Log Activity")')

      // Modal should open
      await expect(page.locator('text=Log Activity')).toBeVisible()

      // Fill form
      await page.selectOption('select', 'contact')
      // Contact time is auto-filled
      await page.fill('textarea', 'Initial contact via email')

      // Submit
      await page.click('button[type="submit"]:has-text("Log Activity")')

      // Should show success
      await expect(page.locator('text=Activity logged successfully')).toBeVisible()

      // Activity should appear in timeline
      await expect(page.locator('text=Contact Made')).toBeVisible()
      await expect(page.locator('text=Initial contact via email')).toBeVisible()
    })

    test('should log a response activity', async ({ page }) => {
      // Open drawer
      await page.click('text=Test Publisher')
      await page.click('button:has-text("Log Activity")')

      // Select response type
      await page.selectOption('select', 'response')
      await page.selectOption('select:below(select)', 'positive')

      // Submit
      await page.click('button[type="submit"]:has-text("Log Activity")')

      // Should show success
      await expect(page.locator('text=Activity logged successfully')).toBeVisible()

      // Status badge should update to positive
      await page.click('button:has([class*="X"])') // Close drawer
      await expect(page.locator('text=Positive')).toBeVisible()
    })

    test('should log closed won with deal value', async ({ page }) => {
      // Open drawer
      await page.click('text=Test Publisher')
      await page.click('button:has-text("Log Activity")')

      // Fill form
      await page.selectOption('select', 'response')
      await page.selectOption('select:below(select)', 'positive')

      // Select closed won
      const closedSelect = page.locator('select').nth(2) // Third select
      await closedSelect.selectOption('closed_won')

      // Fill deal value
      await page.fill('input[type="number"]', '50000')

      // Submit
      await page.click('button[type="submit"]:has-text("Log Activity")')

      // Should show success
      await expect(page.locator('text=Activity logged successfully')).toBeVisible()

      // Status should be Won
      await page.click('button:has([class*="X"])')
      await expect(page.locator('text=Won')).toBeVisible()
    })

    test('should delete an activity', async ({ page }) => {
      // Log an activity first
      await page.click('text=Test Publisher')
      await page.click('button:has-text("Log Activity")')
      await page.fill('textarea', 'Activity to delete')
      await page.click('button[type="submit"]:has-text("Log Activity")')
      await page.waitForTimeout(1000)

      // Click delete button on activity
      await page.click('button:has([class*="Trash"])').first()

      // Confirm (browser confirm dialog)
      page.on('dialog', dialog => dialog.accept())

      // Should show success
      await expect(page.locator('text=Activity deleted')).toBeVisible()
    })
  })

  test.describe('Stats and Tracking', () => {
    test('should track retarget count', async ({ page }) => {
      // Create list and item
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      const listName = `Retarget Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      await page.click(`text=${listName}`)
      await page.click('button:has-text("Add Items")')
      await page.fill('input[id="itemValue"]', 'retarget.com')
      await page.click('button[type="submit"]:has-text("Add Item")')
      await page.waitForTimeout(1000)

      // Log retarget activity
      await page.click('text=retarget.com')
      await page.click('button:has-text("Log Activity")')
      await page.selectOption('select:below(select)', 'retarget')
      await page.click('button[type="submit"]:has-text("Log Activity")')
      await page.waitForTimeout(1000)

      // Close drawer
      await page.click('button:has([class*="X"])')

      // Should show retarget count
      await expect(page.locator('text=1 retarget')).toBeVisible()
    })

    test('should show warning for 3+ retargets', async ({ page }) => {
      // Create list and item
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      const listName = `Warning Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      await page.click(`text=${listName}`)
      await page.click('button:has-text("Add Items")')
      await page.fill('input[id="itemValue"]', 'warning.com')
      await page.click('button[type="submit"]:has-text("Add Item")')
      await page.waitForTimeout(1000)

      // Log 3 retargets
      for (let i = 0; i < 3; i++) {
        await page.click('text=warning.com')
        await page.click('button:has-text("Log Activity")')
        await page.selectOption('select:below(select)', 'retarget')
        await page.click('button[type="submit"]:has-text("Log Activity")')
        await page.waitForTimeout(500)
        await page.click('button:has([class*="X"])')
        await page.waitForTimeout(500)
      }

      // Should show warning
      await expect(page.locator('text=Warning')).toBeVisible()
    })

    test('should update stats in real-time', async ({ page }) => {
      // Create list
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      const listName = `Stats Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      await page.click(`text=${listName}`)

      // Check initial stats
      await expect(page.locator('text=0').first()).toBeVisible() // 0 items

      // Add item
      await page.click('button:has-text("Add Items")')
      await page.fill('input[id="itemValue"]', 'stats.com')
      await page.click('button[type="submit"]:has-text("Add Item")')
      await page.waitForTimeout(1000)

      // Stats should update
      await expect(page.locator('text=1').first()).toBeVisible() // 1 item

      // Log activity
      await page.click('text=stats.com')
      await page.click('button:has-text("Log Activity")')
      await page.click('button[type="submit"]:has-text("Log Activity")')
      await page.waitForTimeout(1000)

      // Reload to see updated stats
      await page.reload()

      // Contact count should be 1
      const statsCards = page.locator('[class*="rounded-lg border"]')
      await expect(statsCards).toContainText('1')
    })
  })

  test.describe('Navigation and Back Button', () => {
    test('should navigate back to overview', async ({ page }) => {
      // Create and enter a list
      await page.goto(`${BASE_URL}/sales-lists`)
      await page.click('button:has-text("New List")')

      const listName = `Nav Test ${Date.now()}`
      await page.fill('input[id="name"]', listName)
      await page.click('button[type="submit"]:has-text("Create List")')
      await page.waitForTimeout(1000)

      await page.click(`text=${listName}`)
      await page.waitForURL(/\/sales-lists\/[a-f0-9-]+/)

      // Click back button
      await page.click('button:has([class*="ArrowLeft"])')

      // Should return to overview
      await page.waitForURL(`${BASE_URL}/sales-lists`)
      await expect(page.locator('h1')).toContainText('My Sales Lists')
    })
  })
})
