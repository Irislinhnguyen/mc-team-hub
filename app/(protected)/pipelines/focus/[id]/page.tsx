'use client'

/**
 * Focus Detail Page
 * Shows focus details with tabs: Suggestions, Dashboard, Activity
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2, Plus, ExternalLink, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { EditFocusModal } from '@/app/components/pipelines/EditFocusModal'
import { AddPipelinesModal } from '@/app/components/pipelines/AddPipelinesModal'
import { PipelineDetailDrawer } from '@/app/components/pipelines/PipelineDetailDrawer'
import type { Focus, FocusSuggestion } from '@/lib/types/focus'
import type { Pipeline } from '@/lib/types/pipeline'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

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

const TABS = ['Suggestions', 'Dashboard', 'Activity']

export default function FocusDetailPage() {
  const params = useParams()
  const router = useRouter()
  const focusId = params.id as string
  const { toast } = useToast()

  const [focus, setFocus] = useState<Focus | null>(null)
  const [suggestions, setSuggestions] = useState<FocusSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Suggestions')

  // Add Pipelines Modal
  const [showAddPipelinesModal, setShowAddPipelinesModal] = useState(false)

  // Edit Focus Modal
  const [showEditFocusModal, setShowEditFocusModal] = useState(false)

  // Pipeline Drawer
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)

  useEffect(() => {
    loadFocus()
  }, [focusId])

  async function loadFocus() {
    try {
      const response = await fetch(`/api/focus-of-month/${focusId}`)
      const data = await response.json()

      if (data.status === 'ok') {
        setFocus(data.data)
        setSuggestions(data.data.suggestions || [])
      }
    } catch (error) {
      console.error('Error loading focus:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateSuggestionStatus(
    suggestionId: string,
    updates: {
      user_status?: string
      cannot_create_reason?: string | null
      cannot_create_reason_other?: string | null
      user_remark?: string | null
    }
  ) {
    // Optimistic update - update UI immediately BEFORE API call
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, ...updates } : s
      )
    )

    try {
      const response = await fetch(`/api/focus-of-month/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast({ title: 'Updated successfully' })
      } else {
        // Rollback on error - reload data
        await loadFocus()
        toast({ title: 'Failed to update, reloading...', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating suggestion:', error)
      // Rollback on error - reload data
      await loadFocus()
      toast({ title: 'Failed to update, reloading...', variant: 'destructive' })
    }
  }

  // Handle delete suggestion
  async function handleDeleteSuggestion(suggestionId: string) {
    try {
      const response = await fetch(`/api/focus-of-month/suggestions/${suggestionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from state
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
        toast({ title: 'Suggestion deleted successfully' })
      } else {
        toast({ title: 'Failed to delete suggestion', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error)
      toast({ title: 'Failed to delete suggestion', variant: 'destructive' })
    }
  }

  // Open pipeline drawer
  async function handleOpenPipelineDrawer(pipelineId: string) {
    setLoadingPipeline(true)
    setPipelineDrawerOpen(true)

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}`)
      const data = await response.json()

      if (data.status === 'ok') {
        setSelectedPipeline(data.pipeline)
      } else {
        toast({ title: 'Failed to load pipeline', variant: 'destructive' })
        setPipelineDrawerOpen(false)
      }
    } catch (error) {
      console.error('Error loading pipeline:', error)
      toast({ title: 'Failed to load pipeline', variant: 'destructive' })
      setPipelineDrawerOpen(false)
    } finally {
      setLoadingPipeline(false)
    }
  }

  // Handle focus status change
  async function handleChangeStatus(newStatus: string) {
    try {
      const response = await fetch(`/api/focus-of-month/${focusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        loadFocus()
        toast({ title: `Focus ${newStatus} successfully` })
      } else {
        toast({ title: 'Failed to update status', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  // Handle focus deletion
  async function handleDeleteFocus() {
    if (!confirm('Are you sure you want to delete this Focus? This will delete ALL suggestions and cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/focus-of-month/${focusId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: 'Focus deleted successfully' })
        router.push('/pipelines/focus')
      } else {
        const data = await response.json()
        toast({ title: data.message || 'Failed to delete focus', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting focus:', error)
      toast({ title: 'Failed to delete focus', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!focus) {
    return (
      <div className="p-8 text-center">
        <p>Focus not found</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/pipelines/focus')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 style={{ fontSize: typography.sizes.pageTitle }} className={composedStyles.pageTitle}>
              {focus.title}
            </h1>
            <Badge
              variant={
                focus.status === 'published'
                  ? 'default'
                  : focus.status === 'draft'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {focus.status}
            </Badge>
          </div>
          <p className={`text-sm ${colors.text.muted} ml-12`}>
            {focus.description || 'No description'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Status Change Buttons - based on current status */}
          {focus.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleChangeStatus('published')}
              >
                Publish Focus
              </Button>
              <Button
                variant="outline"
                onClick={() => handleChangeStatus('archived')}
              >
                Archive Focus
              </Button>
            </>
          )}
          {focus.status === 'published' && (
            <Button
              variant="outline"
              onClick={() => handleChangeStatus('archived')}
            >
              Archive Focus
            </Button>
          )}

          {/* Edit Button */}
          <Button
            variant="outline"
            onClick={() => setShowEditFocusModal(true)}
          >
            Edit Focus
          </Button>

          {/* Add Pipelines Button - only show if not archived */}
          {focus.status !== 'archived' && (
            <Button onClick={() => setShowAddPipelinesModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pipelines
            </Button>
          )}

          {/* Delete Button - show if not archived */}
          {focus.status !== 'archived' && (
            <Button variant="destructive" onClick={handleDeleteFocus}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Focus
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Suggestions"
          value={suggestions.length}
          icon={<Clock className={`h-5 w-5 ${colors.text.muted}`} />}
          valueColor={colors.text.primary}
        />
        <StatCard
          label="Created"
          value={suggestions.filter((s) => s.user_status === 'created' || s.pipeline_created).length}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          valueColor="text-green-600"
        />
        <StatCard
          label="Cannot Create"
          value={suggestions.filter((s) => s.user_status === 'cannot_create').length}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          valueColor="text-red-600"
        />
        <StatCard
          label="Pending"
          value={suggestions.filter((s) => !s.user_status || s.user_status === 'pending').length}
          icon={<Clock className={`h-5 w-5 ${colors.text.muted}`} />}
          valueColor={colors.text.secondary}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#1565C0] text-[#1565C0] font-semibold'
                  : `border-transparent text-slate-500 hover:text-slate-700`
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`${colors.background.card} rounded-lg border`}>
        {activeTab === 'Suggestions' && (
          <SuggestionsTable
            suggestions={suggestions}
            onUpdateStatus={updateSuggestionStatus}
            onOpenPipelineDrawer={handleOpenPipelineDrawer}
            onDeleteSuggestion={handleDeleteSuggestion}
          />
        )}
        {activeTab === 'Dashboard' && <DashboardTab focusId={focusId} />}
        {activeTab === 'Activity' && <ActivityTab focusId={focusId} />}
      </div>

      {/* Add Pipelines Modal */}
      <AddPipelinesModal
        focusId={focusId}
        isOpen={showAddPipelinesModal}
        onClose={() => setShowAddPipelinesModal(false)}
        onSuccess={() => {
          setShowAddPipelinesModal(false)
          loadFocus()
          toast({ title: 'Pipelines added successfully' })
        }}
      />

      {/* Edit Focus Modal */}
      <EditFocusModal
        focus={focus}
        open={showEditFocusModal}
        onOpenChange={setShowEditFocusModal}
        onSuccess={() => {
          setShowEditFocusModal(false)
          loadFocus()
          toast({ title: 'Focus updated successfully' })
        }}
      />

      {/* Pipeline Detail Drawer */}
      {selectedPipeline && (
        <PipelineDetailDrawer
          pipeline={selectedPipeline}
          open={pipelineDrawerOpen}
          onOpenChange={(open) => {
            setPipelineDrawerOpen(open)
            if (!open) {
              setSelectedPipeline(null)
            }
          }}
          onUpdate={async (updates) => {
            try {
              await fetch(`/api/pipelines/${selectedPipeline.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              })
              // Reload pipeline data
              handleOpenPipelineDrawer(selectedPipeline.id)
              // Reload focus suggestions (pipeline status might affect matching)
              loadFocus()
              toast({ title: 'Pipeline updated successfully' })
            } catch (error) {
              console.error('Error updating pipeline:', error)
              toast({ title: 'Failed to update pipeline', variant: 'destructive' })
            }
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  valueColor = colors.text.primary,
}: {
  label: string
  value: number
  icon: React.ReactNode
  valueColor?: string
}) {
  return (
    <div className={`${colors.background.card} rounded-lg border ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm ${colors.text.muted}`}>{label}</span>
        {icon}
      </div>
      <p style={{ fontSize: typography.sizes.metricValue }} className={`font-bold ${valueColor}`}>
        {value}
      </p>
    </div>
  )
}

function SuggestionsTable({
  suggestions,
  onUpdateStatus,
  onOpenPipelineDrawer,
  onDeleteSuggestion,
}: {
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
}) {
  const [editingCannotCreate, setEditingCannotCreate] = useState<string | null>(null)

  // Track selected reasons locally for immediate UI feedback
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({})

  // Track remark drafts locally for real-time typing feedback
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({})

  // Bulk selection state
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  // Handle individual suggestion deletion
  async function handleDeleteSuggestion(suggestionId: string) {
    if (!confirm('Delete this suggestion?')) return

    try {
      const response = await fetch(`/api/focus-of-month/suggestions/${suggestionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Call parent's delete handler to update state
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
      // Delete all selected
      await Promise.all(
        Array.from(selectedSuggestions).map((id) =>
          fetch(`/api/focus-of-month/suggestions/${id}`, { method: 'DELETE' })
        )
      )

      // Optimistic update
      setSuggestions((prev) =>
        prev.filter((s) => !selectedSuggestions.has(s.id))
      )
      setSelectedSuggestions(new Set())
      toast({ title: 'Deleted successfully' })
    } catch (error) {
      console.error('Error deleting suggestions:', error)
      toast({ title: 'Failed to delete suggestions', variant: 'destructive' })
    }
  }

  // Handle select all
  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedSuggestions(new Set(suggestions.map((s) => s.id)))
    } else {
      setSelectedSuggestions(new Set())
    }
  }

  // Debounced remark update
  const debouncedUpdateRemark = useMemo(
    () =>
      debounce((suggestionId: string, remark: string) => {
        onUpdateStatus(suggestionId, { user_remark: remark })
      }, 500),
    [onUpdateStatus]
  )

  return (
    <div className="space-y-4">
      {/* Bulk Delete Bar */}
      {selectedSuggestions.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            {selectedSuggestions.size} suggestion(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedSuggestions.size === suggestions.length &&
                    suggestions.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>MID</TableHead>
              <TableHead>Media Name</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead className="text-right">30D Requests</TableHead>
              <TableHead>Pipeline Existed</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead className="text-center">Cannot Create</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id}>
              {/* Checkbox for bulk selection */}
              <TableCell className="w-12">
                <Checkbox
                  checked={selectedSuggestions.has(suggestion.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSuggestions((prev) => new Set(prev).add(suggestion.id))
                    } else {
                      setSelectedSuggestions((prev) => {
                        const next = new Set(prev)
                        next.delete(suggestion.id)
                        return next
                      })
                    }
                  }}
                />
              </TableCell>

              {/* MID */}
              <TableCell className="font-mono text-xs">{suggestion.mid}</TableCell>

              {/* Media Name */}
              <TableCell>{suggestion.media_name || '-'}</TableCell>

              {/* Product */}
              <TableCell>
                <Badge variant="outline">{suggestion.product}</Badge>
              </TableCell>

              {/* PIC */}
              <TableCell>{suggestion.pic || '-'}</TableCell>

              {/* 30D Requests */}
              <TableCell className="text-right">
                {suggestion.last_30d_requests?.toLocaleString() || '-'}
              </TableCell>

              {/* Pipeline Existed */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={suggestion.pipeline_created || false}
                    onCheckedChange={(checked) => {
                      onUpdateStatus(suggestion.id, { pipeline_created: checked })
                    }}
                  />
                  {suggestion.matched_pipeline_id && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onOpenPipelineDrawer(suggestion.matched_pipeline_id!)}
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>

              {/* Quarter */}
              <TableCell>
                <Select
                  value={suggestion.quarter || ''}
                  onValueChange={(value) => {
                    onUpdateStatus(suggestion.id, { quarter: value })
                  }}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {generateQuarters(3).map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Cannot Create Checkbox */}
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-2">
                  <Checkbox
                    checked={suggestion.user_status === 'cannot_create'}
                    disabled={suggestion.pipeline_created}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditingCannotCreate(suggestion.id)
                      } else {
                        // Clear reason when unchecking
                        setSelectedReasons(prev => {
                          const newReasons = { ...prev }
                          delete newReasons[suggestion.id]
                          return newReasons
                        })
                        onUpdateStatus(suggestion.id, {
                          user_status: 'pending',
                          cannot_create_reason: null,
                          cannot_create_reason_other: null,
                        })
                        setEditingCannotCreate(null)
                      }
                    }}
                  />

                  {/* Inline reason selector */}
                  {editingCannotCreate === suggestion.id && (
                    <div className="mt-2 min-w-[180px]">
                      <Select
                        value={suggestion.cannot_create_reason || selectedReasons[suggestion.id] || ''}
                        onValueChange={(reason) => {
                          // Update local state immediately
                          setSelectedReasons(prev => ({ ...prev, [suggestion.id]: reason }))
                          onUpdateStatus(suggestion.id, {
                            user_status: 'cannot_create',
                            cannot_create_reason: reason,
                          })
                          // Don't close edit mode - keep reason visible
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No traffic">No traffic</SelectItem>
                          <SelectItem value="Publisher declined">Publisher declined</SelectItem>
                          <SelectItem value="Already using similar product">
                            Already using similar product
                          </SelectItem>
                          <SelectItem value="Technical limitation">
                            Technical limitation
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Show "Other" text input when Other is selected */}
                      {(suggestion.cannot_create_reason === 'Other' || selectedReasons[suggestion.id] === 'Other') && (
                        <Input
                          placeholder="Please specify..."
                          className="h-8 text-xs mt-2"
                          value={suggestion.cannot_create_reason_other || ''}
                          onChange={(e) => {
                            onUpdateStatus(suggestion.id, {
                              cannot_create_reason_other: e.target.value,
                            })
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Show reason if set and not in edit mode */}
                  {suggestion.cannot_create_reason && editingCannotCreate !== suggestion.id && (
                    <div className="text-xs text-gray-600 text-center">
                      <div>{suggestion.cannot_create_reason}</div>
                      {suggestion.cannot_create_reason === 'Other' && suggestion.cannot_create_reason_other && (
                        <div className="text-gray-500 italic">{suggestion.cannot_create_reason_other}</div>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Remark Input */}
              <TableCell>
                <Input
                  value={remarkDrafts[suggestion.id] ?? (suggestion.user_remark || '')}
                  onChange={(e) => {
                    const newValue = e.target.value
                    // Update local state immediately for real-time feedback
                    setRemarkDrafts(prev => ({ ...prev, [suggestion.id]: newValue }))
                    // Debounced backend update
                    debouncedUpdateRemark(suggestion.id, newValue)
                  }}
                  placeholder="Add remark..."
                  className="h-8 text-xs"
                />
              </TableCell>

              {/* Status Badge */}
              <TableCell>
                {suggestion.pipeline_created ? (
                  <Badge className="bg-green-100 text-green-700">Created</Badge>
                ) : suggestion.user_status === 'cannot_create' ? (
                  <Badge className="bg-red-100 text-red-700">Cannot Create</Badge>
                ) : suggestion.user_status === 'skipped' ? (
                  <Badge className="bg-gray-100 text-gray-700">Skipped</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>

              {/* Actions - Delete button */}
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSuggestion(suggestion.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </div>
  )
}

function DashboardTab({ focusId }: { focusId: string }) {
  return (
    <div className="p-6">
      <p className="text-gray-500">Dashboard coming soon...</p>
    </div>
  )
}

function ActivityTab({ focusId }: { focusId: string }) {
  return (
    <div className="p-6">
      <p className="text-gray-500">Activity log coming soon...</p>
    </div>
  )
}
