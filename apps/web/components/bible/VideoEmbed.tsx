'use client'

/**
 * VideoEmbed Component
 * Supports YouTube, Vimeo, Loom, and direct video URLs
 */

import { useState, useCallback } from 'react'
import { Play, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoEmbedProps {
  url: string
  title?: string
  autoplay?: boolean
  className?: string
}

/**
 * Extract video ID from YouTube URL
 */
function getYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Extract video ID from Vimeo URL
 */
function getVimeoId(url: string): string | null {
  const regex = /vimeo\.com\/(\d+)/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Check if URL is from Loom
 */
function isLoomUrl(url: string): boolean {
  return /loom\.com/.test(url)
}

/**
 * Get embed URL from video URL
 */
function getEmbedUrl(url: string): string | null {
  // YouTube
  const youtubeId = getYouTubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?rel=0`
  }

  // Vimeo
  const vimeoId = getVimeoId(url)
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`
  }

  // Loom - use the share URL directly
  if (isLoomUrl(url)) {
    // Convert loom.com/share/xxx to loom.com/embed/xxx
    if (url.includes('/share/')) {
      return url.replace('/share/', '/embed/')
    }
    return url
  }

  // Direct video URL (mp4, webm, etc.)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return url
  }

  return null
}

/**
 * Check if URL is a direct video file
 */
function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

export function VideoEmbed({
  url,
  title = 'Video',
  autoplay = false,
  className = '',
}: VideoEmbedProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const embedUrl = getEmbedUrl(url)

  // Handle error
  const handleError = useCallback(() => {
    setError('Failed to load video')
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <p className="text-muted-foreground text-sm">
          Unsupported video URL: {url}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  const autoplayParam = autoplay ? '&autoplay=1' : ''
  const mutedParam = autoplay ? '&mute=1' : ''

  // Direct video file (HTML5 video)
  if (isDirectVideoUrl(url)) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        <video
          className="w-full"
          controls
          controlsList="nodownload"
          onError={handleError}
        >
          <source src={url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // YouTube embed
  if (getYouTubeId(url)) {
    return (
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'} ${className}`}>
        <iframe
          src={`${embedUrl}${autoplayParam}${mutedParam}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={handleError}
        />
        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-black/70"
            onClick={toggleFullscreen}
          >
            <Minimize className="h-5 w-5" />
          </Button>
        )}
      </div>
    )
  }

  // Vimeo embed
  if (getVimeoId(url)) {
    return (
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'} ${className}`}>
        <iframe
          src={`${embedUrl}?title=0&byline=0&portrait=0${autoplayParam}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onError={handleError}
        />
        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-black/70"
            onClick={toggleFullscreen}
          >
            <Minimize className="h-5 w-5" />
          </Button>
        )}
      </div>
    )
  }

  // Loom embed (iframe)
  if (isLoomUrl(url)) {
    return (
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'} ${className}`}>
        <iframe
          src={`${embedUrl}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allowFullScreen
          onError={handleError}
        />
        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-black/70"
            onClick={toggleFullscreen}
          >
            <Minimize className="h-5 w-5" />
          </Button>
        )}
      </div>
    )
  }

  return null
}
