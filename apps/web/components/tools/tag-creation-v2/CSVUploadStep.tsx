'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowRight, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { HelpIcon } from '@/components/tools/tag-creation/HelpIcon'
import type { TeamType } from '@query-stream-ai/types/tools'

interface CSVUploadStepProps {
  teamType: TeamType
  onNext: () => void
  onBack: () => void
}

interface CSVUploadResult {
  zones: Array<{
    zone_id: string
    zone_name: string
    size: string
    inventory_type?: string | null
    type?: string | null
    category?: string | null
    approval_status?: string | null
    impressions?: number | null
    ctr?: number | null
    revenue?: number | null
    ecpm?: number | null
    ad_source?: string | null
    payout_rate?: string
    floor_price?: string
    account?: string
  }>
  publisherId: string
  mediaId: string
  mediaName: string
  count: number
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']

export function CSVUploadStep({ teamType, onNext, onBack }: CSVUploadStepProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null)
  const [error, setError] = useState<string>('')

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)')
      setFile(null)
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 5MB limit. Your file: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError('')
    setUploadResult(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Please select a CSV file to upload')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('csv', file)

      const response = await fetch('/api/tools/tag-creation/parse-csv', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV file')
      }

      setUploadResult(data)
      console.log('[CSVUploadStep] Upload successful:', data)

      // Auto-advance after successful upload (optional - can remove if user wants to review first)
      // onNext()
    } catch (err: any) {
      console.error('[CSVUploadStep] Upload error:', err)
      setError(err.message || 'Failed to upload CSV file')
    } finally {
      setIsUploading(false)
    }
  }, [file])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return

    // Create a synthetic event with the dropped file
    const syntheticEvent = {
      target: {
        files: [droppedFile]
      }
    } as React.ChangeEvent<HTMLInputElement>

    handleFileChange(syntheticEvent)
  }, [handleFileChange])

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            2
          </div>
          <div className="flex items-center">
            <CardTitle className="text-base">Upload CSV from Ad System</CardTitle>
            <HelpIcon
              title="How to get the CSV"
              content={`After uploading your Excel file to the ad platform:
1. Wait for zones to be created (platform assigns Zone IDs)
2. Download the zoneInfo.csv file from the ad platform
3. Upload the CSV file here

💡 The CSV contains: zoneId, zoneName, mediaId, mediaName, publisherId
✅ No screenshot needed - CSV data is 100% accurate`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            file
              ? 'border-green-300 bg-green-50'
              : error
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="csv-upload"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <label
            htmlFor="csv-upload"
            className={`cursor-pointer ${isUploading ? 'pointer-events-none' : ''}`}
          >
            <div className="flex flex-col items-center gap-3">
              {isUploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Parsing CSV file...</p>
                </>
              ) : file ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setFile(null)
                      setUploadResult(null)
                      setError('')
                    }}
                    className="text-xs text-red-600 hover:text-red-700 underline"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">.csv files only, max 5MB</p>
                </>
              )}
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {uploadResult && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Successfully parsed {uploadResult.count} zones
              </p>
              <p className="text-xs text-green-700 mt-1">
                Publisher ID: {uploadResult.publisherId} • Media: {uploadResult.mediaName}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleUpload}
            size="lg"
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Upload CSV
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
