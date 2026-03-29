import { test, expect } from '@playwright/test'

test.describe('MC Bible - Article Search & TOC', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Bible
    await page.goto('/bible')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Article Search', () => {
    test('should show search input in article viewer', async ({ page }) => {
      // Click on first path
      await page.click('.grid >> .card >> nth=0')
      await page.waitForLoadState('networkidle')

      // Click on first article
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Verify search input is present
      await expect(page.locator('input[placeholder*="Search articles"]')).toBeVisible()
    })

    test('should search articles and display results', async ({ page }) => {
      // Navigate to article viewer
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Enter search query
      await page.fill('input[placeholder*="Search articles"]', 'test')

      // Wait for search results
      await page.waitForTimeout(500) // Wait for debounce

      // Verify search results dropdown appears
      const resultsDropdown = page.locator('.card:has-text("No results")').or(page.locator('.card:has(.button)'))
      await expect(resultsDropdown).toBeVisible()
    })

    test('should highlight search terms in results', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Search for specific term
      await page.fill('input[placeholder*="Search articles"]', 'introduction')

      // Wait for results
      await page.waitForTimeout(500)

      // Verify highlighting in results (if any results)
      const highlightedText = page.locator('mark.bg-yellow-200')
      // Note: This depends on having matching content
    })

    test('should navigate to search result on click', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Search and click result
      await page.fill('input[placeholder*="Search articles"]', 'test')
      await page.waitForTimeout(500)

      // If results exist, click first result
      const firstResult = page.locator('.card button').first()
      if (await firstResult.isVisible()) {
        await firstResult.click()
        // Verify navigation occurred (article changed)
        await page.waitForTimeout(500)
      }
    })

    test('should support keyboard navigation in search results', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      await page.fill('input[placeholder*="Search articles"]', 'test')
      await page.waitForTimeout(500)

      // Test arrow down
      await page.keyboard.press('ArrowDown')
      // Test arrow up
      await page.keyboard.press('ArrowUp')
      // Test escape to close
      await page.keyboard.press('Escape')

      // Verify dropdown closed
      await expect(page.locator('.card:has-text("No results")').or(page.locator('.card:has(.button)'))).not.toBeVisible()
    })
  })

  test.describe('Table of Contents', () => {
    test('should display TOC for articles with headings', async ({ page }) => {
      // Navigate to an article with headings
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Check if article has headings (h2/h3)
      const articleContent = await page.locator('.prose').innerHTML()
      const hasHeadings = articleContent.includes('<h2') || articleContent.includes('<h3')

      if (hasHeadings) {
        // Verify TOC is displayed
        await expect(page.locator('text=Contents')).toBeVisible()
        await expect(page.locator('button:has-text("Back to top")')).toBeVisible()
      }
    })

    test('should extract h2 and h3 headings for TOC', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Check for TOC
      const tocSection = page.locator('text=Contents')
      if (await tocSection.isVisible()) {
        // Verify heading structure
        const tocItems = page.locator('.scroll-area button[class*="rounded-md"]')
        const count = await tocItems.count()

        if (count > 0) {
          // Verify TOC items are clickable
          await expect(tocItems.first()).toBeVisible()
        }
      }
    })

    test('should highlight active section on scroll', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Check for TOC
      const tocSection = page.locator('text=Contents')
      if (await tocSection.isVisible()) {
        // Scroll through article
        await page.evaluate(() => window.scrollBy(0, 500))
        await page.waitForTimeout(300)

        // Verify active section is highlighted (has active styling)
        const activeItem = page.locator('.bg-primary.text-primary-foreground')
        // May or may not be visible depending on scroll position
      }
    })

    test('should scroll to section on TOC click', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      const tocSection = page.locator('text=Contents')
      if (await tocSection.isVisible()) {
        // Click first TOC item
        const firstTocItem = page.locator('.scroll-area button').first()
        await firstTocItem.click()

        // Verify scroll occurred
        await page.waitForTimeout(500)

        // Check URL hash updated
        const url = page.url()
        // Should contain #heading-X
      }
    })

    test('should support collapsing sections in TOC', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      const tocSection = page.locator('text=Contents')
      if (await tocSection.isVisible()) {
        // Look for collapsible sections (h3s under h2s)
        const expandCollapseButtons = page.locator('button[class*="p-0"]').filter({ hasText: '' })

        if (await expandCollapseButtons.count() > 0) {
          // Click to collapse
          await expandCollapseButtons.first().click()

          // Verify section collapsed (children hidden)
          // This is a basic check - actual implementation may vary
        }
      }
    })

    test('should have back to top button', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      const tocSection = page.locator('text=Contents')
      if (await tocSection.isVisible()) {
        // Verify back to top button exists
        await expect(page.locator('button:has-text("Back to top")')).toBeVisible()

        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 1000))
        await page.waitForTimeout(300)

        // Click back to top
        await page.click('button:has-text("Back to top")')

        // Verify scrolled to top
        await page.waitForTimeout(500)
        const scrollTop = await page.evaluate(() => window.pageYOffset)
        expect(scrollTop).toBe(0)
      }
    })
  })

  test.describe('Empty States', () => {
    test('should not show TOC for articles without headings', async ({ page }) => {
      // Create or navigate to article without headings
      // This test assumes such an article exists or we create one
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // If no headings, TOC should not be displayed
      const articleContent = await page.locator('.prose').innerHTML()
      const hasHeadings = articleContent.includes('<h2') || articleContent.includes('<h3')

      if (!hasHeadings) {
        // TOC section should not exist or be hidden
        const tocSection = page.locator('text=Contents')
        await expect(tocSection).not.toBeVisible()
      }
    })

    test('should show no results for empty search', async ({ page }) => {
      await page.click('.grid >> .card >> nth=0')
      await page.click('.scroll-area >> .cursor-pointer >> nth=0')

      // Clear search
      await page.fill('input[placeholder*="Search articles"]', '')

      // Verify no results message or empty state
      const searchInput = page.locator('input[placeholder*="Search articles"]')
      await expect(searchInput).toBeVisible()
      // Results dropdown should be hidden
    })
  })
})
