'use client'

/**
 * ArticleSearch - Search within Bible article content
 * Provides debounced search with result highlighting
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, X, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { bible } from '@/lib/design-tokens'

interface SearchResult {
  id: string
  title: string
  content_type: string
  rank: number
}

interface ArticleSearchProps {
  articleId?: string // Optional: current article for highlighting
  pathId?: string // Optional: search within specific path
  onResultClick?: (articleId: string) => void
}

export function ArticleSearch({ articleId, pathId, onResultClick }: ArticleSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Debounced search
  const searchArticles = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    setLoading(true)
    try {
      const pathParam = pathId ? `?path_id=${pathId}` : ''
      const response = await fetch(`/api/bible/articles/search?q=${encodeURIComponent(searchQuery)}${pathParam}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setShowResults(true)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [pathId])

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchArticles(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, searchArticles])

  // Handle keyboard navigation
  useEffect(() => {
    if (!showResults || results.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        handleResultClick(results[selectedIndex])
      } else if (e.key === 'Escape') {
        setShowResults(false)
        setQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showResults, results, selectedIndex])

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false)
    setQuery('')
    setSelectedIndex(-1)

    if (onResultClick) {
      onResultClick(result.id)
    } else {
      // Navigate to the article
      router.push(`/bible/paths/${pathId || ''}`)
    }
  }

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    )
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${bible.iconSizes.sm} text-muted-foreground`} />
        <Input
          type="text"
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          className="pl-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${bible.iconSizes.md}`}
            onClick={() => {
              setQuery('')
              setResults([])
              setShowResults(false)
            }}
          >
            <X className={bible.iconSizes.sm} />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card className={`absolute z-50 w-full mt-2 ${bible.sizes.tocScroll} overflow-y-auto`}>
          <CardContent className="p-0">
            {loading ? (
              <div className={`${bible.spacing.cardPadding} text-center text-muted-foreground`}>
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className={`${bible.spacing.cardPadding} text-center text-muted-foreground`}>
                No results found for "{query}"
              </div>
            ) : (
              <div className="divide-y">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    className={`w-full text-left ${bible.spacing.cardPadding} hover:bg-accent transition-colors ${
                      index === selectedIndex ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className={`flex items-start justify-between ${bible.spacing.listGap}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${bible.typography.buttonText} mb-1`}>
                          {highlightMatch(result.title, query)}
                        </div>
                        <div className={`flex items-center ${bible.spacing.buttonGap}`}>
                          <Badge variant="secondary" className={bible.typography.badgeText}>
                            {result.content_type}
                          </Badge>
                          <span className={`${bible.typography.badgeText} text-muted-foreground`}>
                            Relevance: {Math.round(result.rank * 100)}%
                          </span>
                        </div>
                      </div>
                      <ExternalLink className={`${bible.iconSizes.sm} text-muted-foreground flex-shrink-0 mt-1`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Help Text */}
      {!showResults && query === '' && (
        <p className={`${bible.typography.helperText} mt-1`}>
          Search article titles and content. Use keyboard arrows to navigate.
        </p>
      )}
    </div>
  )
}
