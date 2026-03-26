'use client'

/**
 * ArticleEditor Component
 * Rich text editor using TinyMCE for creating/editing Bible articles
 */

import { Editor } from '@tinymce/tinymce-react'
import { useCallback, useState, useRef } from 'react'
import { getTinyMCEConfig, sanitizeHtml } from '@/lib/tinymce/config'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { bible } from '@/lib/design-tokens'

interface ArticleEditorProps {
  value: string
  onChange: (value: string) => void
  readonly?: boolean
  height?: number
  onImageUpload?: (file: File) => Promise<string>
}

export function ArticleEditor({
  value,
  onChange,
  readonly = false,
  height = 600,
  onImageUpload,
}: ArticleEditorProps) {
  const editorRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Handle image upload
  const handleImageUpload = useCallback(
    async (blobInfo: any, progress: any) => {
      if (onImageUpload) {
        setIsLoading(true)
        try {
          const file = blobInfo.blob()
          const url = await onImageUpload(file)
          return url
        } catch (error) {
          console.error('Image upload failed:', error)
          throw new Error('Image upload failed')
        } finally {
          setIsLoading(false)
        }
      }
      // Default: return base64 data URL
      return blobInfo.blobUri()
    },
    [onImageUpload]
  )

  const config = {
    ...getTinyMCEConfig({ height, readonly }),
    images_upload_handler: onImageUpload ? handleImageUpload : undefined,
  }

  const handleEditorChange = (content: string) => {
    // Sanitize content before sending to parent
    const sanitized = sanitizeHtml(content)
    onChange(sanitized)
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className={`flex items-center ${bible.spacing.buttonGap}`}>
            <Loader2 className={`${bible.iconSizes.sm} animate-spin`} />
            <span className={bible.typography.buttonText}>Uploading image...</span>
          </div>
        </div>
      )}
      <Editor
        apiKey={config.apiKey}
        init={config}
        value={value}
        onEditorChange={handleEditorChange}
        disabled={readonly}
        onInit={(evt, editor) => (editorRef.current = editor)}
      />
    </div>
  )
}

export default ArticleEditor
