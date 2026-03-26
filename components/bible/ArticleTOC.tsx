'use client'

/**
 * ArticleTOC - Table of Contents for long articles
 * Displays hierarchical headings with active section highlighting
 */

import { useState, useEffect, useCallback } from 'react'
import { List, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TocItem } from '@/lib/utils/article-toc'
import { extractArticleTOC, getActiveHeading, scrollToHeading } from '@/lib/utils/article-toc'
import { bible } from '@/lib/design-tokens'

interface ArticleTOCProps {
  content: string // HTML content
  className?: string
}

export function ArticleTOC({ content, className }: ArticleTOCProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Extract TOC from content
  useEffect(() => {
    const tocItems = extractArticleTOC(content)
    setToc(tocItems)
  }, [content])

  // Track active heading on scroll
  useEffect(() => {
    if (toc.length === 0) return

    const handleScroll = () => {
      const activeHeading = getActiveHeading(toc)
      setActiveId(activeHeading)
    }

    // Initial check
    handleScroll()

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [toc])

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleHeadingClick = (headingId: string) => {
    scrollToHeading(headingId)
  }

  const renderTocItem = (item: TocItem, level: number = 0) => {
    const isActive = activeId === item.id
    const isCollapsed = collapsedSections.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id} className={bible.spacing.itemGap}>
        <button
          onClick={() => handleHeadingClick(item.id)}
          className={`w-full text-left flex items-start ${bible.spacing.buttonGap} px-2 py-1.5 rounded-md ${bible.typography.buttonText} transition-colors ${
            isActive
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-accent'
          }`}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleSection(item.id)
              }}
              className="flex-shrink-0 p-0 hover:bg-transparent"
            >
              {isCollapsed ? (
                <ChevronRight className={bible.iconSizes.xs} />
              ) : (
                <ChevronDown className={bible.iconSizes.xs} />
              )}
            </button>
          )}
          <span className="flex-1 truncate">{item.text}</span>
        </button>

        {hasChildren && !isCollapsed && (
          <div className={`ml-4 ${bible.spacing.itemGap}`}>
            {item.children.map((child) => renderTocItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (toc.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className={`flex items-center ${bible.spacing.buttonGap} mb-4`}>
        <List className={bible.iconSizes.sm} />
        <h3 className={bible.typography.tocTitle}>Contents</h3>
        <Badge variant="secondary" className={bible.typography.badgeText}>
          {toc.length}
        </Badge>
      </div>

      <ScrollArea className={`${bible.sizes.scrollArea} ${bible.sizes.tocScroll}`}>
        <nav className={`${bible.spacing.itemGap} pr-4`}>
          {toc.map((item) => renderTocItem(item))}
        </nav>
      </ScrollArea>

      {/* Back to top button */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full mt-4 ${bible.typography.badgeText}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        Back to top
      </Button>
    </div>
  )
}
