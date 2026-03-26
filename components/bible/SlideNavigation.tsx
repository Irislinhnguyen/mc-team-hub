'use client'

/**
 * SlideNavigation - Navigation controls for slide decks
 * Provides prev/next buttons and slide counter
 * Integrates with iframe via postMessage for Google Slides
 */

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { bible } from '@/lib/design-tokens'

interface SlideNavigationProps {
  totalSlides?: number
  onNavigate?: (direction: 'prev' | 'next') => void
  showKeyboardHint?: boolean
}

export function SlideNavigation({
  totalSlides,
  onNavigate,
  showKeyboardHint = true,
}: SlideNavigationProps) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    if (!showKeyboardHint) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate('prev')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Navigate slides
  const navigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentSlide > 1) {
      setCurrentSlide(currentSlide - 1)
      // Send postMessage to Google Slides iframe
      sendPostMessage('prev')
    } else if (direction === 'next') {
      if (!totalSlides || currentSlide < totalSlides) {
        setCurrentSlide(currentSlide + 1)
        sendPostMessage('next')
      }
    }

    onNavigate?.(direction)
  }

  // Send postMessage to Google Slides iframe
  const sendPostMessage = (action: 'prev' | 'next') => {
    if (!iframeRef.current) return

    try {
      iframeRef.current.contentWindow?.postMessage(
        { action: action === 'next' 'POLL_NEXT' : 'POLL_PREV' },
        '*'
      )
    } catch (error) {
      console.error('Error sending postMessage:', error)
    }
  }

  const canGoPrev = currentSlide > 1
  const canGoNext = !totalSlides || currentSlide < totalSlides

  return (
    <div className={`flex items-center justify-between ${bible.spacing.formGap} ${bible.spacing.cardPadding} border rounded-lg bg-muted/20`}>
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('prev')}
        disabled={!canGoPrev}
      >
        <ChevronLeft className={`${bible.iconSizes.sm} mr-1`} />
        Previous
      </Button>

      {/* Slide Counter */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={`${bible.typography.badgeText} px-3 py-1`}>
          {currentSlide}
          {totalSlides && ` / ${totalSlides}`}
        </Badge>
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('next')}
        disabled={!canGoNext}
      >
        Next
        <ChevronRight className={`${bible.iconSizes.sm} ml-1`} />
      </Button>

      {/* Keyboard Hint */}
      {showKeyboardHint && (
        <div className={`hidden md:block ${bible.typography.helperText}`}>
          Use ← → arrow keys to navigate
        </div>
      )}
    </div>
  )
}
