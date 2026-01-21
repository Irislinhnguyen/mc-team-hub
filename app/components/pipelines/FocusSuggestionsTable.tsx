'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, ExternalLink, Loader2, CirclePlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PipelineDetailDrawer } from '@/app/components/pipelines/PipelineDetailDrawer'
import type { FocusSuggestion } from '@/lib/types/focus'
import type { Pipeline } from '@/lib/types/pipeline'
import { typography, composedStyles } from '@/lib/design-tokens'
import { colors } from '@/lib/colors'

// Cannot create reasons enum
const CANNOT_CREATE_REASONS = [
  'No traffic',
  'Publisher declined',
  'Already using similar product',
  'Technical limitation',
  'Other',
] as const

// Helper to generate quarter options (3 years back from current)
function generateQuarters(yearsBack: number): string[] {
  const quarters: string[] = []
  const currentYear = new Date().getFullYear()

  for (let year = currentYear; year >= currentYear - yearsBack; year--) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`)
    }
  }
  return quarters
}

// Helper to truncate text
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

interface FocusSuggestionsTableProps {
  suggestions: FocusSuggestion[]
  onUpdateStatus: (
    id: string,
    updates: {
      user_status?: string
      cannot_create_reason?: string | null
      cannot_create_reason_other?: string | null
      user_remark?: string | null
    }
  ) => void
  onOpenPipelineDrawer: (pipelineId: string) => void
  onDeleteSuggestion: (suggestionId: string) => void
  onDeleteSuccess?: (deletedIds: string[]) => void
  onRemarkUpdate?: (mid: string, product: string, newRemark: string) => void
}

function FocusSuggestionsTable({
  suggestions,
  onUpdateStatus,
  onOpenPipelineDrawer,
  onDeleteSuggestion,
  onDeleteSuccess,
  onRemarkUpdate,
}: FocusSuggestionsTableProps) {
  const { toast } = useToast()

  // Cannot create editing state
  const [editingCannotCreate, setEditingCannotCreate] = useState<string | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({})

  // Global remark dialog state
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false)
  const [selectedPipelineForRemark, setSelectedPipelineForRemark] = useState<{
    mid: string
    product: string
    currentRemark: string | null
  } | null>(null)
  // Use ref for textarea to avoid re-renders on every keystroke
  const remarkTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Bulk selection state
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  // Pipeline drawer state
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)

  // Handle select all
  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedSuggestions(new Set(suggestions.map((s) => s.id)))
    } else {
      setSelectedSuggestions(new Set())
    }
  }

  // Handle bulk delete
  async function handleBulkDelete() {
    if (selectedSuggestions.size === 0) return

    if (!confirm(`Delete ${selectedSuggestions.size} suggestion(s)?`)) return

    try {
      await Promise.all(
        Array.from(selectedSuggestions).map((id) =>
          fetch(`/api/focus-of-month/suggestions/${id}`, { method: 'DELETE' })
        )
      )

      // Notify parent to update state
      const deletedIds = Array.from(selectedSuggestions)
      onDeleteSuccess?.(deletedIds)
      setSelectedSuggestions(new Set())
      toast({ title: 'Deleted successfully' })
    } catch (error) {
      console.error('Error deleting suggestions:', error)
      toast({ title: 'Failed to delete suggestions', variant: 'destructive' })
    }
  }

  // Open remark dialog for editing
  function openRemarkDialog(suggestion: FocusSuggestion) {
    setSelectedPipelineForRemark({
      mid: suggestion.mid,
      product: suggestion.product,
      currentRemark: (suggestion as any).global_remark || null,
    })
    setRemarkDialogOpen(true)
    // Set textarea value after dialog opens (uncontrolled input)
    setTimeout(() => {
      if (remarkTextareaRef.current) {
        remarkTextareaRef.current.value = (suggestion as any).global_remark || ''
      }
    }, 0)
  }

  // Save remark
  async function saveRemark() {
    if (!selectedPipelineForRemark) return

    // Get value from textarea ref instead of state
    const remarkValue = remarkTextareaRef.current?.value || ''

    const response = await fetch('/api/pipeline-remarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mid: selectedPipelineForRemark.mid,
        product: selectedPipelineForRemark.product,
        remark: remarkValue,
      }),
    })

    if (response.ok) {
      toast({ title: 'Remark saved successfully' })
      setRemarkDialogOpen(false)
      // Notify parent to update state instead of reloading
      onRemarkUpdate?.(
        selectedPipelineForRemark.mid,
        selectedPipelineForRemark.product,
        remarkValue
      )
    } else {
      toast({ title: 'Failed to save remark', variant: 'destructive' })
    }
  }

  // Handle pipeline click
  async function handlePipelineClick(suggestion: FocusSuggestion) {
    if (!suggestion.pipeline_id) return

    setLoadingPipeline(true)
    setPipelineDrawerOpen(true)
    setSelectedPipeline({
      id: suggestion.pipeline_id,
      mid: suggestion.mid,
      product: suggestion.product,
    } as Pipeline)
    setLoadingPipeline(false)
  }

  const quarters = generateQuarters(3)
  const allSelected = suggestions.length > 0 && selectedSuggestions.size === suggestions.length

  return (
    <div className="space-y-4">
      {/* Bulk Delete Bar (when items selected) */}
      {selectedSuggestions.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium">{selectedSuggestions.size} suggestion(s) selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Scrollable Table Container - 10 rows visible - matching DataTable pattern */}
      <div
        className="overflow-x-auto overflow-y-auto border border-gray-200 rounded-b-lg"
        style={{
          height: '540px', // 10 rows * 48px per row + header
          minWidth: 0,
          width: '100%',
        }}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 shadow-sm" style={{ zIndex: 20, backgroundColor: '#ffffff' }}>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th className="w-[4%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="w-[6%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>MID</th>
              <th className="w-[6%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Media Name</th>
              <th className="w-[7%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Product</th>
              <th className="w-[8%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>PIC</th>
              <th className="w-[6%] px-2 py-2 text-right font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>30D Requests</th>
              <th className="w-[7%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Pipeline</th>
              <th className="w-[7%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Quarter</th>
              <th className="w-[10%] px-2 py-2 text-center font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Cannot Create</th>
              <th className="w-[43%] px-2 py-2 text-left font-semibold leading-tight" style={{ fontSize: typography.sizes.filterHeader, color: colors.text.secondary }}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((suggestion, idx) => (
              <tr
                key={suggestion.id}
                className="border-b border-slate-200 transition-colors"
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}
              >
                <td className="w-[4%] px-2 py-2 align-middle [&:has([role=checkbox])]:pr-0">
                  <Checkbox
                    checked={selectedSuggestions.has(suggestion.id)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedSuggestions)
                      if (checked) {
                        newSet.add(suggestion.id)
                      } else {
                        newSet.delete(suggestion.id)
                      }
                      setSelectedSuggestions(newSet)
                    }}
                    aria-label={`Select ${suggestion.mid}`}
                  />
                </td>

                <td className="w-[6%] px-2 py-2 leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>{suggestion.mid}</td>

                <td className="w-[6%] px-2 py-2 leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-2 text-xs" title={suggestion.media_name}>
                      {suggestion.media_name || '-'}
                    </span>
                    {suggestion.pipeline_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handlePipelineClick(suggestion)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </td>

                <td className="w-[7%] px-2 py-2 align-middle">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.product}
                  </Badge>
                </td>

                <td className="w-[8%] px-2 py-2 leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>{suggestion.pic || '-'}</td>

                <td className="w-[6%] px-2 py-2 text-right leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>
                  {suggestion.last_30d_requests?.toLocaleString() || 0}
                </td>

                <td className="w-[7%] px-2 py-2 leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={suggestion.pipeline_created || false}
                      onCheckedChange={(checked) => {
                        onUpdateStatus(suggestion.id, { pipeline_created: checked })
                      }}
                    />
                    {suggestion.pipeline_id && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handlePipelineClick(suggestion)}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </td>

                <td className="w-[7%] px-2 py-2 align-middle">
                  <Select
                    value={suggestion.quarter || ''}
                    onValueChange={(value) => onUpdateStatus(suggestion.id, { quarter: value })}
                    disabled={!suggestion.pipeline_created}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue placeholder={suggestion.pipeline_created ? "Select" : "Locked"} />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="w-[10%] px-2 py-2 align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <Checkbox
                      checked={suggestion.user_status === 'cannot_create'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onUpdateStatus(suggestion.id, { user_status: 'cannot_create' })
                          setEditingCannotCreate(suggestion.id)
                        } else {
                          onUpdateStatus(suggestion.id, { user_status: 'pending' })
                        }
                      }}
                    />
                    {suggestion.user_status === 'cannot_create' && (
                      <span
                        className="text-xs text-center cursor-pointer hover:text-blue-600"
                        style={{ fontSize: typography.sizes.dataPoint }}
                        title={(suggestion as any).global_cannot_create_reason || ''}
                        onClick={() => setEditingCannotCreate(suggestion.id)}
                      >
                        {truncate((suggestion as any).global_cannot_create_reason, 15)}
                      </span>
                    )}
                  </div>

                  {/* Inline reason selector */}
                  {editingCannotCreate === suggestion.id && (
                    <div className="mt-2 space-y-2">
                      <Select
                        value={
                          selectedReasons[suggestion.id] ||
                          (suggestion as any).global_cannot_create_reason ||
                          ''
                        }
                        onValueChange={(value) => {
                          setSelectedReasons((prev) => ({ ...prev, [suggestion.id]: value }))
                          onUpdateStatus(suggestion.id, {
                            cannot_create_reason: value,
                            cannot_create_reason_other: value === 'Other' ? ((suggestion as any).global_cannot_create_reason_other || '') : null,
                          })
                          setEditingCannotCreate(null)
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANNOT_CREATE_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* "Other" reason detail input */}
                      {(selectedReasons[suggestion.id] === 'Other' ||
                        (suggestion as any).global_cannot_create_reason === 'Other') && (
                        <Input
                          type="text"
                          placeholder="Specify reason..."
                          defaultValue={(suggestion as any).global_cannot_create_reason_other || ''}
                          onBlur={(e) => {
                            onUpdateStatus(suggestion.id, {
                              cannot_create_reason_other: e.target.value || null,
                            })
                          }}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  )}
                </td>

                <td className="w-[43%] px-2 py-2 leading-tight" style={{ fontSize: typography.sizes.dataPoint }}>
                  {(suggestion as any).global_remark ? (
                    <div className="flex items-start gap-2 group">
                      <div
                        className="text-xs overflow-y-auto p-2 bg-gray-50 rounded border border-gray-200 min-h-[60px] max-h-[100px] flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
                        title={(suggestion as any).global_remark}
                      >
                        {(suggestion as any).global_remark}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRemarkDialog(suggestion)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRemarkDialog(suggestion)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <CirclePlus className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remark Dialog */}
      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pipeline Remark</DialogTitle>
            <DialogDescription>
              This remark will be shared across ALL focuses for this pipeline (mid: {selectedPipelineForRemark?.mid}, product: {selectedPipelineForRemark?.product})
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={remarkTextareaRef}
            placeholder="Enter remark..."
            rows={4}
            className="my-4 resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveRemark()}>Save Remark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Detail Drawer */}
      {pipelineDrawerOpen && selectedPipeline && (
        <PipelineDetailDrawer
          pipeline={selectedPipeline}
          open={pipelineDrawerOpen}
          onClose={() => {
            setPipelineDrawerOpen(false)
            setSelectedPipeline(null)
          }}
        />
      )}
    </div>
  )
}

export default FocusSuggestionsTable
