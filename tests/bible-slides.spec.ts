import { test, expect } from '@playwright/test'

test.describe('MC Bible - Slides Support', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Bible management page
    await page.goto('/bible/manage')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should create a slide deck article', async ({ page }) => {
    // Click "Create New Article" button
    await page.click('button:has-text("Create New Article")')

    // Wait for dialog to appear
    await expect(page.locator('dialog[open]')).toBeVisible()

    // Fill in article details
    await page.fill('#article-title', 'Test Slide Deck')

    // Select "Slide Deck" content type
    await page.selectOption('#article-type', 'slides')

    // Enter slide deck URL (Google Slides public example)
    await page.fill('#article-slides', 'https://docs.google.com/presentation/d/e/2PACX-1vRMYa4sDQl8CqO4r5L6qO8pK9wM0nN1pP2rS3tU4vW5x/edit')

    // Add minimal content
    await page.fill('textarea[placeholder*="content"]', '<p>Supporting content for slide deck</p>')

    // Save the article
    await page.click('button:has-text("Save")')

    // Wait for dialog to close
    await expect(page.locator('dialog[open]')).not.toBeVisible({ timeout: 5000 })

    // Verify success toast/notification
    await expect(page.locator('text=Article created successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should display slide deck in article viewer', async ({ page }) => {
    // Navigate to a path with slides article
    await page.goto('/bible/paths')

    // Click on first path
    await page.click('.grid >> .card >> nth=0')

    // Wait for path detail page
    await page.waitForLoadState('networkidle')

    // Click on first article
    await page.click('.scroll-area >> .cursor-pointer >> nth=0')

    // Verify slide viewer is present
    await expect(page.locator('iframe')).toBeVisible()

    // Verify fallback link is present
    await expect(page.locator('a:has-text("Open in new tab")')).toBeVisible()
  })

  test('should show fallback link when iframe fails', async ({ page }) => {
    // Navigate to Bible management
    await page.goto('/bible/manage')

    // Create article with invalid slide URL
    await page.click('button:has-text("Create New Article")')
    await page.fill('#article-title', 'Invalid Slide Deck')
    await page.selectOption('#article-type', 'slides')
    await page.fill('#article-slides', 'https://invalid-url-that-will-fail.com/slides')
    await page.fill('textarea[placeholder*="content"]', '<p>Test content</p>')
    await page.click('button:has-text("Save")')

    // Navigate to view the article
    await page.goto('/bible/paths')
    await page.click('.grid >> .card >> nth=0')
    await page.click('.scroll-area >> .cursor-pointer >> nth=0')

    // Verify fallback message is shown
    await expect(page.locator('text=Unable to display slides inline')).toBeVisible()
    await expect(page.locator('a:has-text("Open in new tab")')).toBeVisible()
  })

  test('should support Google Slides URLs', async ({ page }) => {
    const googleSlidesUrl = 'https://docs.google.com/presentation/d/test123/edit'

    // Create article with Google Slides URL
    await page.goto('/bible/manage')
    await page.click('button:has-text("Create New Article")')
    await page.fill('#article-title', 'Google Slides Test')
    await page.selectOption('#article-type', 'slides')
    await page.fill('#article-slides', googleSlidesUrl)
    await page.fill('textarea[placeholder*="content"]', '<p>Test</p>')
    await page.click('button:has-text("Save")')

    // Verify article is created
    await expect(page.locator('text=Article created successfully')).toBeVisible()
  })

  test('should support PowerPoint Online URLs', async ({ page }) => {
    const pptUrl = 'https://1drv.ms/b/s!Test123'

    // Create article with PowerPoint URL
    await page.goto('/bible/manage')
    await page.click('button:has-text("Create New Article")')
    await page.fill('#article-title', 'PowerPoint Test')
    await page.selectOption('#article-type', 'slides')
    await page.fill('#article-slides', pptUrl)
    await page.fill('textarea[placeholder*="content"]', '<p>Test</p>')
    await page.click('button:has-text("Save")')

    // Verify article is created
    await expect(page.locator('text=Article created successfully')).toBeVisible()
  })

  test('should show slide icon for slide content type', async ({ page }) => {
    // Create a slide article
    await page.goto('/bible/manage')
    await page.click('button:has-text("Create New Article")')
    await page.fill('#article-title', 'Slide Icon Test')
    await page.selectOption('#article-type', 'slides')
    await page.fill('#article-slides', 'https://docs.google.com/presentation/d/test/edit')
    await page.fill('textarea[placeholder*="content"]', '<p>Test</p>')
    await page.click('button:has-text("Save")')

    // Navigate to view the path
    await page.goto('/bible/paths')
    await page.click('.grid >> .card >> nth=0')

    // Verify slide badge is shown in sidebar
    await expect(page.locator('.badge:has-text("slides")')).toBeVisible()
  })

  test('should validate slide deck URL format', async ({ page }) => {
    await page.goto('/bible/manage')
    await page.click('button:has-text("Create New Article")')
    await page.fill('#article-title', 'Invalid URL Test')
    await page.selectOption('#article-type', 'slides')

    // Enter invalid URL (not http/https)
    await page.fill('#article-slides', 'not-a-valid-url')

    // Try to save - should show validation error
    await page.click('button:has-text("Save")')

    // Verify error message
    await expect(page.locator('text=Invalid URL format')).toBeVisible()
  })
})
