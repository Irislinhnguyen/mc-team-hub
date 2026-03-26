'use client'

/**
 * SlideViewer - Display slide deck presentations
 * Supports Google Slides and PowerPoint Online embeds
 */

import { useState } from 'react'
import { ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bible } from '@/lib/design-tokens'

interface SlideViewerProps {
  slideUrl: string
  title: string
}

export function SlideViewer({ slideUrl, title }: SlideViewerProps) {
  const [iframeError, setIframeError] = useState(false)

  // Detect slide platform and convert to embed URL
  const getEmbedUrl = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url)

      // Google Slides
      if (parsedUrl.hostname.includes('docs.google.com')) {
        // Extract document ID and convert to embed format
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
        if (match) {
          const docId = match[1]
          return `https://docs.google.com/presentation/d/${docId}/embed?start=false&loop=false&delayms=3000`
        }
      }

      // PowerPoint Online
      if (parsedUrl.hostname.includes('1drv.ms') || parsedUrl.hostname.includes('officeapps.live.com')) {
        // Already an embed URL or needs conversion
        if (url.includes('/embed')) {
          return url
        }
        // For OneDrive/SharePoint links, use PowerPoint Online viewer
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
      }

      // Unknown platform, try direct embed
      return url
    } catch (error) {
      console.error('Error parsing slide URL:', error)
      return null
    }
  }

  const embedUrl = getEmbedUrl(slideUrl)

  const handleIframeError = () => {
    setIframeError(true)
  }

  if (!embedUrl) {
    return (
      <div className={`flex flex-col items-center justify-center ${bible.spacing.cardPaddingLoose} border rounded-lg bg-muted/20`}>
        <AlertCircle className={`${bible.iconSizes.lg} text-muted-foreground mb-4`} />
        <p className="text-muted-foreground text-center mb-4">
          Unable to load slide deck. The URL may not be supported.
        </p>
        <Button asChild variant="outline">
          <a href={slideUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={`${bible.iconSizes.sm} mr-2`} />
            Open in New Tab
          </a>
        </Button>
      </div>
    )
  }

  if (iframeError) {
    return (
      <div className={`flex flex-col items-center justify-center ${bible.spacing.cardPaddingLoose} border rounded-lg bg-muted/20`}>
        <AlertCircle className={`${bible.iconSizes.lg} text-muted-foreground mb-4`} />
        <p className="text-muted-foreground text-center mb-2">
          Unable to display slides inline due to security restrictions.
        </p>
        <p className={`${bible.typography.buttonText} text-muted-foreground text-center mb-4`}>
          Some platforms block embedded content. You can view the slides directly.
        </p>
        <Button asChild variant="outline">
          <a href={slideUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={`${bible.iconSizes.sm} mr-2`} />
            Open {title} in New Tab
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className={bible.spacing.sectionGap}>
      {/* Slide Viewer */}
      <div className={`relative w-full ${bible.sizes.slideAspect}`}>
        <iframe
          src={embedUrl}
          className="absolute top-0 left-0 w-full h-full border rounded-lg"
          title={title}
          allowFullScreen
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
      </div>

      {/* Fallback Link */}
      <div className={`flex items-center justify-center ${bible.typography.buttonText} text-muted-foreground`}>
        <Button asChild variant="ghost" size="sm">
          <a href={slideUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={`${bible.iconSizes.sm} mr-2`} />
            Open in new tab if slides don't load
          </a>
        </Button>
      </div>
    </div>
  )
}
