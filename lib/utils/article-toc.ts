/**
 * Article TOC Extraction Utility
 * Extracts headings from article HTML and generates table of contents
 */

export interface TocItem {
  id: string
  text: string
  level: number // 2 for h2, 3 for h3, etc.
  children: TocItem[]
}

/**
 * Extract table of contents from article HTML content
 */
export function extractArticleTOC(html: string): TocItem[] {
  if (!html) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Find all h2 and h3 headings
  const headings = doc.querySelectorAll('h2, h3')

  const toc: TocItem[] = []
  const h2Stack: TocItem[] = []

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1)) // 2 or 3
    const text = heading.textContent || ''
    const id = heading.id || `heading-${index}`

    // Add ID to heading if it doesn't have one
    if (!heading.id) {
      heading.id = id
    }

    const tocItem: TocItem = {
      id,
      text,
      level,
      children: [],
    }

    if (level === 2) {
      // Top-level heading
      toc.push(tocItem)
      h2Stack[0] = tocItem
    } else if (level === 3) {
      // Sub-heading under the last h2
      const lastH2 = h2Stack[h2Stack.length - 1]
      if (lastH2) {
        lastH2.children.push(tocItem)
      } else {
        // If no h2 before this h3, treat as top-level
        toc.push(tocItem)
      }
    }
  })

  return toc
}

/**
 * Scroll to heading with smooth behavior
 */
export function scrollToHeading(headingId: string): void {
  const element = document.getElementById(headingId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Update URL hash without scrolling
    history.replaceState(null, '', `#${headingId}`)
  }
}

/**
 * Get current active heading based on scroll position
 */
export function getActiveHeading(toc: TocItem[]): string | null {
  const headingPositions = toc
    .map((item) => {
      const element = document.getElementById(item.id)
      if (!element) return null

      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      return {
        id: item.id,
        top: scrollTop + rect.top,
      }
    })
    .filter((pos) => pos !== null)
    .sort((a, b) => a.top - b.top)

  const scrollPosition = window.pageYOffset || document.documentElement.scrollTop

  // Find the last heading that's above the current scroll position
  for (let i = headingPositions.length - 1; i >= 0; i--) {
    if (headingPositions[i].top <= scrollPosition + 100) {
      return headingPositions[i].id
    }
  }

  return null
}
