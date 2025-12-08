'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Upload, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ExtractedZone } from '@/lib/types/tools'
import { HelpIcon } from './HelpIcon'

interface ZoneExtractionStepProps {
  onComplete: (zones: ExtractedZone[]) => void
  onBack: () => void
}

export function ZoneExtractionStep({ onComplete, onBack }: ZoneExtractionStepProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedZones, setExtractedZones] = useState<ExtractedZone[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILES = 10

  // Helper function to process files from any source
  const processFiles = useCallback((newFiles: File[]) => {
    // Check total count
    const totalFiles = files.length + newFiles.length
    if (totalFiles > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} screenshots allowed. You're trying to add ${newFiles.length} more (current: ${files.length})`)
      return
    }

    // Validate each file
    const validFiles: File[] = []
    for (const file of newFiles) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setError(`${file.name}: Please upload PNG or JPG images only`)
        continue
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name}: File size must be less than 10MB`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Clear error if validation passed
    setError(null)
    setExtractedZones(null)

    // Add to files array
    setFiles(prev => [...prev, ...validFiles])

    // Create previews for all new files
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }, [files])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    processFiles(Array.from(selectedFiles))
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
    setExtractedZones(null)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(Array.from(droppedFiles))
    }
  }

  // Paste handler (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const pastedFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          pastedFiles.push(blob)
        }
      }
    }

    if (pastedFiles.length > 0) {
      processFiles(pastedFiles)
    }
  }, [processFiles])

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  const handleExtract = async () => {
    if (files.length === 0) return

    setIsExtracting(true)
    setError(null)

    try {
      // Process all files in parallel
      const allZones: ExtractedZone[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('screenshot', file)

        const response = await fetch('/api/tools/tag-creation/extract-zones', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(`${file.name}: ${data.error || 'Failed to extract zones'}`)
        }

        // Add zones from this image to the collection
        if (data.zones && data.zones.length > 0) {
          allZones.push(...data.zones)
        }
      }

      console.log('[ZoneExtractionStep] Successfully extracted zones:', allZones)
      setExtractedZones(allZones)
    } catch (err: any) {
      console.error('[ZoneExtractionStep] Error extracting zones:', err)
      setError(err.message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleNext = () => {
    console.log('[ZoneExtractionStep] Continue button clicked')
    console.log('[ZoneExtractionStep] Extracted zones:', extractedZones)
    if (extractedZones && extractedZones.length > 0) {
      console.log('[ZoneExtractionStep] Calling onComplete with', extractedZones.length, 'zones')
      onComplete(extractedZones)
    } else {
      console.error('[ZoneExtractionStep] No zones to pass to next step')
      setError('No zones extracted. Please try scanning again.')
    }
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            2
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-[#1565C0]">Extract Zone IDs</CardTitle>
            <span className="text-xs text-red-600 font-medium">*Required</span>
            <HelpIcon
              title="How it works (Required Step)"
              content={`This step is REQUIRED - upload screenshots of your zones table.

You can upload up to 10 screenshots (useful if zones span multiple pages).

Three ways to upload:
1. Click the upload area to select files (can select multiple)
2. Drag & drop images directly into the upload area
3. Copy image (Ctrl+C) and paste (Ctrl+V) anywhere on the page

Supported formats: PNG or JPG (max 10MB per file)

The AI will automatically extract Zone IDs and names from all screenshots.
Make sure Zone IDs and Zone Names are clearly visible in each image.

All zones from all screenshots will be combined into one list.`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#1565C0] bg-blue-50'
                : files.length > 0
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 hover:border-[#1565C0]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />

            {files.length > 0 ? (
              <div className="space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-[#1565C0]" />
                <p className="text-sm font-medium text-gray-900">
                  {files.length} screenshot{files.length > 1 ? 's' : ''} uploaded
                </p>
                <p className="text-xs text-gray-500">
                  {files.map(f => f.name).join(', ')}
                </p>
                <Button variant="outline" size="sm" type="button">
                  Add More Screenshots ({files.length}/{MAX_FILES})
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-10 w-10 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isDragging ? 'Drop images here' : 'Click to upload screenshots'}
                  </p>
                  {!isDragging && (
                    <p className="text-xs text-gray-500 mt-2">
                      or drag & drop • or press Ctrl+V to paste
                      <br />
                      <span className="text-gray-400">Max {MAX_FILES} screenshots</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Images */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative border rounded-lg overflow-hidden group">
                  <img
                    src={preview}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                      aria-label="Remove image"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                    <p className="truncate">{files[index]?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Extract Button */}
        {files.length > 0 && !extractedZones && (
          <Button onClick={handleExtract} disabled={isExtracting} className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white" size="lg">
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting from {files.length} screenshot{files.length > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Extract Zones from {files.length} Screenshot{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        {/* Extracted Zones Preview */}
        {extractedZones && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-900 mb-4">
              <CheckCircle2 className="h-4 w-4 text-[#1565C0] flex-shrink-0" />
              <p className="font-medium">
                Extracted {extractedZones.length} zones from {files.length} screenshot{files.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Zones Table */}
            <div className="rounded-lg overflow-auto max-h-96 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Zone ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Zone Name</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedZones.map((zone, index) => (
                    <tr key={index} className="even:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-900">{zone.zone_id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{zone.zone_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {extractedZones && (
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setExtractedZones(null)
                setError(null)
              }}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Re-scan
            </Button>
            <Button onClick={handleNext} size="lg" className="flex-1 bg-[#1565C0] hover:bg-[#0D47A1] text-white">
              Continue to Enter Metadata
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
