'use client'

/**
 * FileAttachment Component
 * Display downloadable files with preview support
 */

import { useState, useCallback } from 'react'
import {
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileArchive,
  FileCode,
  Download,
  ExternalLink,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bible } from '@/lib/design-tokens'

interface FileAttachmentProps {
  url: string
  fileName: string
  fileSize?: number
  mimeType?: string
  className?: string
}

/**
 * Get file icon based on mime type or file extension
 */
function getFileIcon(fileName: string, mimeType?: string): React.ElementType {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) ||
      mime.startsWith('image/')) {
    return ImageIcon
  }

  // Videos
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext) ||
      mime.startsWith('video/')) {
    return Video
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext) ||
      mime.startsWith('audio/')) {
    return Music
  }

  // PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    return FileText
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) ||
      mime.includes('zip') || mime.includes('archive')) {
    return FileArchive
  }

  // Code
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext) ||
      mime.includes('javascript') || mime.includes('json')) {
    return FileCode
  }

  // Default
  return File
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Check if file can be previewed in browser
 */
function canPreviewInline(fileName: string, mimeType?: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
      mime.startsWith('image/')) {
    return true
  }

  // PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    return true
  }

  // Videos
  if (['mp4', 'webm'].includes(ext) ||
      ['video/mp4', 'video/webm'].includes(mime)) {
    return true
  }

  return false
}

/**
 * Check if file is an image
 */
function isImage(fileName: string, mimeType?: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''

  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
         mime.startsWith('image/')
}

export function FileAttachment({
  url,
  fileName,
  fileSize,
  mimeType,
  className = '',
}: FileAttachmentProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const FileIcon = getFileIcon(fileName, mimeType)
  const canPreview = canPreviewInline(fileName, mimeType)
  const isImg = isImage(fileName, mimeType)

  const handleDownload = useCallback(() => {
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [url, fileName])

  const handlePreview = useCallback(() => {
    setPreviewError(false)
    setPreviewOpen(true)
  }, [])

  const handlePreviewError = useCallback(() => {
    setPreviewError(true)
  }, [])

  return (
    <>
      <div
        className={`flex items-center ${bible.spacing.listGap} ${bible.spacing.cardPaddingCompact} rounded-lg border bg-card ${bible.states.hover} transition-colors ${className}`}
      >
        <div className="flex-shrink-0">
          <FileIcon className={`${bible.iconSizes.lg} text-muted-foreground`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`${bible.typography.buttonText} font-medium truncate`}>{fileName}</p>
          {fileSize && (
            <p className={bible.typography.badgeText}>{formatFileSize(fileSize)}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
            >
              <ExternalLink className={`${bible.iconSizes.sm} mr-1`} />
              Preview
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Download className={`${bible.iconSizes.sm} mr-1`} />
            Download
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      {canPreview && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl ${bible.sizes.dialogMax} overflow-hidden">
            <DialogHeader>
              <DialogTitle>{fileName}</DialogTitle>
              <DialogDescription>
                {fileSize && formatFileSize(fileSize)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto flex items-center justify-center ${bible.sizes.dialogContent}">
              {previewError ? (
                <div className="text-center text-muted-foreground">
                  <FileIcon className={`${bible.iconSizes.xxl} mx-auto mb-4 opacity-50`} />
                  <p>Preview not available</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleDownload}
                  >
                    Download Instead
                  </Button>
                </div>
              ) : isImg ? (
                <img
                  src={url}
                  alt={fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={handlePreviewError}
                />
              ) : (
                <iframe
                  src={url}
                  title={fileName}
                  className="w-full h-[70vh] border-0 rounded"
                  onError={handlePreviewError}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
