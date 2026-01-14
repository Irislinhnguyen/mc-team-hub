'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { typography, spacing, componentHeights, composedStyles, colors } from '@/lib/design-tokens'

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
}

export function FocusSuggestionsTable({
  suggestions,
  onUpdateStatus,
  onOpenPipelineDrawer,
  onDeleteSuggestion,
}: FocusSuggestionsTableProps) {
  const { toast } = useToast()

  // Filter state
  const [filters, setFilters] = useState<{
    pic: string | null
    status: string[]
    product: string[]
    pipeline_created: boolean | null
    quarter: string | null
  }>({
    pic: null,
    status: [],
    product: [],
    pipeline_created: null,
    quarter: null,
  })

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
  const [remarkText, setRemarkText] = useState('')

  // Bulk selection state
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  // Pipeline drawer state
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)

  // Get unique values for filters
  const uniquePics = useMemo(() => {
    return Array.from(new Set(suggestions.map((s) => s.pic).filter(Boolean)))
  }, [suggestions])

  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(suggestions.map((s) => s.product).filter(Boolean)))
  }, [suggestions])

  const uniqueQuarters = useMemo(() => {
    return Array.from(new Set(suggestions.map((s) => s.quarter).filter(Boolean)))
  }, [suggestions])

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    const filtered = suggestions.filter((s) => {
      if (filters.pic && s.pic !== filters.pic) return false
      if (filters.status.length > 0 && !filters.status.includes(s.user_status || 'pending')) return false
      if (filters.product.length > 0 && !filters.product.includes(s.product)) return false
      if (filters.pipeline_created !== null && !!s.pipeline_created !== filters.pipeline_created) return false
      if (filters.quarter && s.quarter !== filters.quarter) return false
      return true
    })
    console.log('[FocusSuggestionsTable] Filter calculated:', { total: suggestions.length, filtered: filtered.length, pics: uniquePics.length, products: uniqueProducts.length, quarters: uniqueQuarters.length })
    return filtered
  }, [suggestions, filters])

  // Debug: Log component render
  console.log('[FocusSuggestionsTable] Component rendering, suggestions:', suggestions.length)

  // Handle select all (for filtered results)
  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedSuggestions(new Set(filteredSuggestions.map((s) => s.id)))
    } else {
      setSelectedSuggestions(new Set())
    }
  }

  // Handle individual suggestion deletion
  async function handleDeleteSuggestion(suggestionId: string) {
    if (!confirm('Delete this suggestion?')) return

    try {
      const response = await fetch(`/api/focus-of-month/suggestions/${suggestionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDeleteSuggestion(suggestionId)
        toast({ title: 'Suggestion deleted successfully' })
      } else {
        toast({ title: 'Failed to delete suggestion', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error)
      toast({ title: 'Failed to delete suggestion', variant: 'destructive' })
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

      // Refresh will happen through parent
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
    setRemarkText((suggestion as any).global_remark || '')
    setRemarkDialogOpen(true)
  }

  // Save remark
  async function saveRemark() {
    if (!selectedPipelineForRemark) return

    const response = await fetch('/api/pipeline-remarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mid: selectedPipelineForRemark.mid,
        product: selectedPipelineForRemark.product,
        remark: remarkText,
      }),
    })

    if (response.ok) {
      toast({ title: 'Remark saved successfully' })
      setRemarkDialogOpen(false)
      window.location.reload() // Reload to get updated remarks
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

  // Get status icon
  function getStatusIcon(status: string | null) {
    switch (status) {
      case 'created':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'cannot_create':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'skipped':
        return <Clock className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const quarters = generateQuarters(3)
  const allSelected = filteredSuggestions.length > 0 && selectedSuggestions.size === filteredSuggestions.length

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className={`flex flex-wrap items-center ${spacing.filterGap} ${spacing.filterPadding} bg-white border rounded-t-lg`}>
        {/* PIC Filter */}
        <Select value={filters.pic || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, pic: v === 'all' ? null : v }))}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder={<span style={{ fontSize: typography.sizes.filterHeader }}>PIC</span>} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" key="pic-all">All PICs</SelectItem>
            {uniquePics.map((pic) => (
              <SelectItem key={pic} value={pic}>
                {pic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status.length === 0 ? 'all' : filters.status.join(',')}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? [] : v.split(',') }))}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder={<span style={{ fontSize: typography.sizes.filterHeader }}>Status</span>} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" key="status-all">All Status</SelectItem>
            <SelectItem value="pending" key="status-pending">Pending</SelectItem>
            <SelectItem value="created" key="status-created">Created</SelectItem>
            <SelectItem value="cannot_create" key="status-cannot-create">Cannot Create</SelectItem>
            <SelectItem value="skipped" key="status-skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>

        {/* Product Filter */}
        <Select
          value={filters.product.length === 0 ? 'all' : filters.product.join(',')}
          onValueChange={(v) => setFilters((f) => ({ ...f, product: v === 'all' ? [] : v.split(',') }))}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder={<span style={{ fontSize: typography.sizes.filterHeader }}>Product</span>} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" key="product-all">All Products</SelectItem>
            {uniqueProducts.map((product) => (
              <SelectItem key={product} value={product}>
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pipeline Created Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ fontSize: typography.sizes.filterHeader }}>Pipeline:</span>
          <Button
            variant={filters.pipeline_created === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, pipeline_created: null }))}
          >
            All
          </Button>
          <Button
            variant={filters.pipeline_created === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, pipeline_created: true }))}
          >
            Yes
          </Button>
          <Button
            variant={filters.pipeline_created === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, pipeline_created: false }))}
          >
            No
          </Button>
        </div>

        {/* Quarter Filter */}
        <Select value={filters.quarter || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, quarter: v === 'all' ? null : v }))}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder={<span style={{ fontSize: typography.sizes.filterHeader }}>Quarter</span>} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" key="quarter-all">All Quarters</SelectItem>
            {quarters.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ pic: null, status: [], product: [], pipeline_created: null, quarter: null })}
        >
          Clear Filters
        </Button>

        {/* Count Badge */}
        <Badge variant="secondary" className="ml-auto">
          {filteredSuggestions.length} / {suggestions.length}
        </Badge>
      </div>

      {/* Bulk Delete Bar (when items selected) */}
      {selectedSuggestions.size > 0 && (
        <div className={`flex items-center justify-between ${spacing.filterPadding} bg-blue-50 border border-blue-200 rounded-lg`}>
          <span className="text-sm font-medium">{selectedSuggestions.size} suggestion(s) selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Scrollable Table Container - 600px for 15 rows */}
      <div
        className="overflow-x-auto overflow-y-auto border border-gray-200 rounded-b-lg"
        style={{
          height: '600px', // 15 rows * 40px per row = 600px
          minHeight: '600px',
        }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
            <TableRow>
              <TableHead className="w-[4%]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[6%]" style={composedStyles.tableHeader}>MID</TableHead>
              <TableHead className="w-[10%]" style={composedStyles.tableHeader}>Media Name</TableHead>
              <TableHead className="w-[7%]" style={composedStyles.tableHeader}>Product</TableHead>
              <TableHead className="w-[8%]" style={composedStyles.tableHeader}>PIC</TableHead>
              <TableHead className="w-[6%] text-right" style={composedStyles.tableHeader}>30D Requests</TableHead>
              <TableHead className="w-[7%]" style={composedStyles.tableHeader}>Pipeline</TableHead>
              <TableHead className="w-[7%]" style={composedStyles.tableHeader}>Quarter</TableHead>
              <TableHead className="w-[10%] text-center" style={composedStyles.tableHeader}>Cannot Create</TableHead>
              <TableHead className="w-[30%]" style={composedStyles.tableHeader}>Remark</TableHead>
              <TableHead className="w-[3%]" style={composedStyles.tableHeader}>Status</TableHead>
              <TableHead className="w-[2%]" style={composedStyles.tableHeader}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {console.log('[FocusSuggestionsTable] About to render table rows, count:', filteredSuggestions.length) || null}
            {filteredSuggestions.slice(0, 1).map((suggestion) => {
              console.log('[FocusSuggestionsTable] Rendering row for suggestion.id:', suggestion.id)
              return (
              <TableRow key={suggestion.id}>
                {console.log('[Row] Checkbox cell') || null}
                <TableCell className="w-[4%]">
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
                </TableCell>

                {console.log('[Row] MID cell') || null}
                <TableCell className="w-[6%]" style={composedStyles.tableData}>{suggestion.mid}</TableCell>

                {console.log('[Row] Media Name cell') || null}
                <TableCell className="w-[10%]" style={composedStyles.tableData}>
                  <div className="flex items-center gap-2">
                    <span className="truncate" title={suggestion.media_name}>
                      {truncate(suggestion.media_name, 20)}
                    </span>
                    {suggestion.pipeline_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePipelineClick(suggestion)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>

                {console.log('[Row] Product cell') || null}
                <TableCell className="w-[7%]">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.product}
                  </Badge>
                </TableCell>

                {console.log('[Row] PIC cell') || null}
                <TableCell className="w-[8%]" style={composedStyles.tableData}>{suggestion.pic || '-'}</TableCell>

                {console.log('[Row] Requests cell') || null}
                <TableCell className="w-[6%] text-right" style={composedStyles.tableData}>
                  {suggestion.last_30d_requests?.toLocaleString() || 0}
                </TableCell>

                {console.log('[Row] Pipeline Created cell') || null}
                <TableCell className="w-[7%]" style={composedStyles.tableData}>
                  {suggestion.pipeline_created ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">Yes</Badge>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </TableCell>

                {console.log('[Row] Quarter Select cell') || null}
                <TableCell className="w-[7%]">
                  <Select
                    value={suggestion.quarter || ''}
                    onValueChange={(value) => onUpdateStatus(suggestion.id, { quarter: value })}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {console.log('[Row] Cannot Create cell') || null}
                <TableCell className="w-[10%]">
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
                </TableCell>

                {console.log('[Row] Remark cell') || null}
                <TableCell className="w-[30%]">
                  {(suggestion as any).global_remark ? (
                    <div className="space-y-1">
                      <div
                        className="text-sm overflow-y-auto max-h-16 p-2 bg-gray-50 rounded border border-gray-200"
                        title={(suggestion as any).global_remark}
                      >
                        {(suggestion as any).global_remark}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRemarkDialog(suggestion)}
                        className="h-7 px-2 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRemarkDialog(suggestion)}
                      className="h-8 text-xs"
                    >
                      Add Remark
                    </Button>
                  )}
                </TableCell>

                {console.log('[Row] Status cell') || null}
                <TableCell className="w-[3%]">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(suggestion.user_status)}
                    <span className="text-xs capitalize" style={{ fontSize: typography.sizes.dataPoint }}>
                      {suggestion.user_status?.replace('_', ' ') || 'pending'}
                    </span>
                  </div>
                </TableCell>

                {console.log('[Row] Actions cell') || null}
                <TableCell className="w-[2%]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSuggestion(suggestion.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
                {console.log('[Row] Row completed for suggestion:', suggestion.id) || null}
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {console.log('[FocusSuggestionsTable] Table completed, rendering Dialog...') || null}

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
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter remark..."
            rows={4}
            className="my-4"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRemark}>Save Remark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {console.log('[FocusSuggestionsTable] Dialog rendered') || null}

      {/* Pipeline Detail Drawer */}
      {console.log('[FocusSuggestionsTable] Checking PipelineDetailDrawer condition:', { pipelineDrawerOpen, hasPipeline: !!selectedPipeline }) || null}
      {pipelineDrawerOpen && selectedPipeline && (
        <PipelineDetailDrawer
          pipelineId={selectedPipeline.id}
          open={pipelineDrawerOpen}
          onOpenChange={setPipelineDrawerOpen}
        />
      )}
      {console.log('[FocusSuggestionsTable] Component END') || null}
    </div>
  )
}
