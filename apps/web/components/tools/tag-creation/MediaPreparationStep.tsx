'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileText, AlertCircle, X, ArrowRight, Plus, FileSpreadsheet } from 'lucide-react'
import type { MediaTemplateRow } from '@query-stream-ai/types/tools'
import { parseCsvFile } from '@/lib/utils/csvParser'
import { parseXlsxFile } from '@/lib/utils/xlsxParser'
import { HelpIcon } from './HelpIcon'

interface MediaPreparationStepProps {
  onComplete: (mediaData: MediaTemplateRow[], childNetworkCode?: string, pic?: string) => void
}

type InputMode = 'upload' | 'manual'

export function MediaPreparationStep({ onComplete }: MediaPreparationStepProps) {
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<MediaTemplateRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual entry form state
  const [manualEntry, setManualEntry] = useState({
    pid: '',
    siteAppName: '',
    siteUrl: '',
    pubname: '',
    mid: '',
  })

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
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
    const isXlsx = file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    if (!isCsv && !isXlsx) {
      setError('Please upload a CSV or XLSX file')
      return
    }

    // Validate file size (10MB max for XLSX support)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    setIsParsing(true)
    setCsvFile(file)

    try {
      // Use appropriate parser based on file type
      const result = isXlsx
        ? await parseXlsxFile(file)
        : await parseCsvFile(file)

      if (!result.success || !result.data) {
        setError(result.error || `Failed to parse ${isXlsx ? 'XLSX' : 'CSV'} file`)
        setParsedData([])
        setIsParsing(false)
        return
      }

      setParsedData(result.data)
      setIsParsing(false)
    } catch (err) {
      console.error('Error parsing file:', err)
      setError(`Failed to parse ${file.name.endsWith('.xlsx') ? 'XLSX' : 'CSV'} file`)
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
      const type = item.type
      if (type.includes('csv') || type.includes('sheet') || type === 'text/csv') {
        const file = item.getAsFile()
        if (file) {
          setInputMode('upload')
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

  // Add manual entry row
  const addManualEntry = () => {
    if (!manualEntry.pid?.trim()) {
      setError('PID is required')
      return
    }
    if (!manualEntry.siteAppName?.trim()) {
      setError('Site/App Name is required')
      return
    }
    if (!manualEntry.siteUrl?.trim()) {
      setError('Site URL is required')
      return
    }

    const newRow: MediaTemplateRow = {
      pid: manualEntry.pid.trim(),
      siteAppName: manualEntry.siteAppName.trim(),
      siteUrl: manualEntry.siteUrl.trim(),
      pubname: manualEntry.pubname?.trim() || undefined,
      mid: manualEntry.mid?.trim() || undefined,
    }

    setParsedData(prev => [...prev, newRow])
    setError(null)

    // Clear form for next entry
    setManualEntry({
      pid: '',
      siteAppName: '',
      siteUrl: '',
      pubname: '',
      mid: '',
    })
  }

  // Add an empty row for manual editing
  const addEmptyRow = () => {
    const newRow: MediaTemplateRow = {
      pid: '',
      siteAppName: '',
      siteUrl: '',
      pubname: '',
      mid: '',
    }
    setParsedData(prev => [...prev, newRow])
  }

  const switchToManualMode = () => {
    setInputMode('manual')
    setCsvFile(null)
    setParsedData([])
    setError(null)
  }

  const switchToUploadMode = () => {
    setInputMode('upload')
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-[#1565C0]">Step 0: Media Preparation</span>
        <span className="text-sm text-gray-400">(Optional)</span>
      </div>

      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={switchToUploadMode}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              inputMode === 'upload'
                ? 'border-[#1565C0] text-[#1565C0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            File Upload
          </button>
          <button
            onClick={switchToManualMode}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              inputMode === 'manual'
                ? 'border-[#1565C0] text-[#1565C0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* File Upload Mode */}
        {inputMode === 'upload' && !csvFile && (
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
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="space-y-3">
              <div className="flex justify-center gap-3">
                <FileSpreadsheet className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isDragging ? 'Drop file here' : 'Click to upload CSV or XLSX file'}
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

        {/* Manual Entry Mode */}
        {inputMode === 'manual' && !csvFile && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">
                  PID (Publisher ID) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={manualEntry.pid}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, pid: e.target.value }))}
                  placeholder="e.g., 12345"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">
                  Site/App Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={manualEntry.siteAppName}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, siteAppName: e.target.value }))}
                  placeholder="e.g., My Mobile App"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Site URL <span className="text-red-500">*</span>
                </label>
                <Input
                  value={manualEntry.siteUrl}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, siteUrl: e.target.value }))}
                  placeholder="e.g., https://example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">
                  Publisher Name
                </label>
                <Input
                  value={manualEntry.pubname}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, pubname: e.target.value }))}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">
                  MID (Media ID)
                </label>
                <Input
                  value={manualEntry.mid}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, mid: e.target.value }))}
                  placeholder="e.g., 67890"
                />
              </div>
            </div>

            <Button
              onClick={addManualEntry}
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>
        )}

        {/* Parsing State */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
            <p className="text-sm text-gray-600">Parsing file...</p>
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Fill in Publisher Name and MID for each row:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={addEmptyRow}
                className="h-8 text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Empty Row
              </Button>
            </div>
            <div className="rounded-lg overflow-auto max-h-80 bg-white border">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 w-24">PID</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Site/App Name</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Site URL</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 w-32">
                      Publisher Name <span className="text-red-500">*</span>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 w-28">
                      MID <span className="text-red-500">*</span>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-2">
                        <Input
                          value={row.pid || ''}
                          onChange={(e) => updateField(index, 'pid', e.target.value)}
                          placeholder="PID"
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.siteAppName || ''}
                          onChange={(e) => updateField(index, 'siteAppName', e.target.value)}
                          placeholder="Site/App Name"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.siteUrl || ''}
                          onChange={(e) => updateField(index, 'siteUrl', e.target.value)}
                          placeholder="Site URL"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.pubname || ''}
                          onChange={(e) => updateField(index, 'pubname', e.target.value)}
                          placeholder="Publisher Name"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.mid || ''}
                          onChange={(e) => updateField(index, 'mid', e.target.value)}
                          placeholder="MID"
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(index)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
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
