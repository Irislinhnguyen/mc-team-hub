'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileText, AlertCircle, X, ArrowRight } from 'lucide-react'
import type { MediaTemplateRow } from '@/lib/types/tools'
import { parseCsvFile } from '@/lib/utils/csvParser'
import { HelpIcon } from './HelpIcon'

interface MediaPreparationStepProps {
  onComplete: (mediaData: MediaTemplateRow[], childNetworkCode?: string, pic?: string) => void
}

export function MediaPreparationStep({ onComplete }: MediaPreparationStepProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<MediaTemplateRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Common fields (CHUNG CHO TẤT CẢ ROWS)
  const [childNetworkCode, setChildNetworkCode] = useState('')
  const [pic, setPic] = useState('')

  // Auto-pass data to parent whenever it changes (even if user doesn't click continue)
  useEffect(() => {
    // Only pass data that has MID filled in
    const validData = parsedData.filter(row => row.mid && row.mid.trim())
    if (validData.length > 0) {
      // Add common fields to each row
      const dataWithCommonFields = parsedData.map(row => ({
        ...row,
        childNetworkCode: childNetworkCode.trim() || undefined,
        pic: pic.trim() || undefined,
      }))
      onComplete(dataWithCommonFields, childNetworkCode.trim(), pic.trim())
    }
  }, [parsedData, childNetworkCode, pic, onComplete])

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setError('Please upload a CSV file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)
    setIsParsing(true)
    setCsvFile(file)

    try {
      const result = await parseCsvFile(file)

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to parse CSV file')
        setParsedData([])
        setIsParsing(false)
        return
      }

      setParsedData(result.data)
      setIsParsing(false)
    } catch (err) {
      console.error('Error parsing CSV:', err)
      setError('Failed to parse CSV file')
      setParsedData([])
      setIsParsing(false)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const removeFile = () => {
    setCsvFile(null)
    setParsedData([])
    setError(null)
    setChildNetworkCode('')
    setPic('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  // Paste handler (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('csv') !== -1 || item.type === 'text/csv') {
        const file = item.getAsFile()
        if (file) {
          processFile(file)
          break
        }
      }
    }
  }, [processFile])

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  // Update field in parsed data
  const updateField = (index: number, field: keyof MediaTemplateRow, value: string) => {
    const updated = [...parsedData]
    updated[index] = { ...updated[index], [field]: value }
    setParsedData(updated)
  }

  // Delete row
  const deleteRow = (index: number) => {
    const updated = parsedData.filter((_, i) => i !== index)
    setParsedData(updated)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-[#1565C0]">Step 0: Media Preparation</span>
        <span className="text-sm text-gray-400">(Optional)</span>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        {!csvFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-gray-400'
                : 'border-gray-300 hover:border-gray-400'
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
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="space-y-3">
              <Upload className="h-10 w-10 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isDragging ? 'Drop CSV file here' : 'Click to upload CSV file'}
                </p>
                {!isDragging && (
                  <p className="text-xs text-gray-500 mt-2">
                    or drag & drop • or press Ctrl+V to paste
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Expected columns: Publisher ID, Site/App Name, Site URL
              </p>
            </div>
          </div>
        )}

        {/* Parsing State */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
            <p className="text-sm text-gray-600">Parsing CSV file...</p>
          </div>
        )}

        {/* File Info & Remove */}
        {csvFile && !isParsing && (
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-700" />
              <div>
                <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                <p className="text-xs text-gray-500">{parsedData.length} rows parsed</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">
                Child Network Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={childNetworkCode}
                onChange={(e) => {
                  setChildNetworkCode(e.target.value)
                  setError(null)
                }}
                placeholder="Enter child network code..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">
                PIC <span className="text-red-500">*</span>
              </label>
              <Input
                value={pic}
                onChange={(e) => {
                  setPic(e.target.value)
                  setError(null)
                }}
                placeholder="Enter PIC..."
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Data Table */}
        {parsedData.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Fill in Publisher Name and MID for each row:
            </p>
            <div className="rounded-lg overflow-auto max-h-80 bg-white border">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">PID</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Site/App Name</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Site URL</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-40">
                      Publisher Name <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-32">
                      MID <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-3 py-2 font-mono text-sm text-gray-900">{row.pid}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={row.siteAppName}>
                        {row.siteAppName}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={row.siteUrl}>
                        {row.siteUrl.length > 40 ? row.siteUrl.substring(0, 40) + '...' : row.siteUrl}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.pubname || ''}
                          onChange={(e) => updateField(index, 'pubname', e.target.value)}
                          placeholder="Enter..."
                          className="h-9 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.mid || ''}
                          onChange={(e) => updateField(index, 'mid', e.target.value)}
                          placeholder="Enter..."
                          className="h-9 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(index)}
                          className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500">
              {parsedData.filter(r => r.mid?.trim() && r.pubname?.trim()).length} of {parsedData.length} rows ready
            </p>
          </div>
        )}

        {parsedData.length > 0 && parsedData.some(r => r.mid?.trim() && r.pubname?.trim()) && (
          <Button
            onClick={() => {
              document.querySelector('[data-step="1"]')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            Continue to next steps
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
