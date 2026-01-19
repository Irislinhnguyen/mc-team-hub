'use client'

export const dynamic = 'force-dynamic'

/**
 * Focus Detail Page
 * Shows focus details with tabs: Suggestions, Dashboard, Activity
 *
 * Access Control:
 * - User: Can only view published focuses (read-only)
 * - Leader/Manager/Admin: Can view/edit all focuses
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { EditFocusModal } from '@/app/components/pipelines/EditFocusModal'
import { AddPipelinesModal } from '@/app/components/pipelines/AddPipelinesModal'
import { PipelineDetailDrawer } from '@/app/components/pipelines/PipelineDetailDrawer'
import FocusSuggestionsTable from '@/app/components/pipelines/FocusSuggestionsTable'
import { FocusDetailSkeleton } from '@/app/components/pipelines/skeletons'
import { PipelinePageLayout } from '@/app/components/pipelines/PipelinePageLayout'
import { useAuth } from '@/app/contexts/AuthContext'
import type { Focus, FocusSuggestion } from '@/lib/types/focus'
import type { Pipeline } from '@/lib/types/pipeline'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'
import { colors as statusColors } from '@/lib/colors'

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
  const { user } = useAuth()

  const [focus, setFocus] = useState<Focus | null>(null)
  const [suggestions, setSuggestions] = useState<FocusSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeTab, setActiveTab] = useState('Suggestions')

  // Check if user can manage focuses (Leader/Manager/Admin)
  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'leader'

  // Filter state for Suggestions tab
  const [filters, setFilters] = useState<{
    pic: string | null
    product: string[]
    pipeline_created: boolean | null
    quarter: string | null
  }>({
    pic: null,
    product: [],
    pipeline_created: null,
    quarter: null,
  })

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

  // Track suggestions state changes
  useEffect(() => {
    console.log('[Suggestions State Updated]', {
      length: suggestions.length,
      firstFew: suggestions.slice(0, 3).map(s => ({
        id: s.id,
        user_status: s.user_status,
        pipeline_created: s.pipeline_created
      }))
    })
  }, [suggestions])

  // Calculate stats using useMemo for efficient recalculation
  const stats = useMemo(() => {
    const total = suggestions.length
    const created = suggestions.filter((s) => s.user_status === 'created' || s.pipeline_created).length
    const cannot_create = suggestions.filter((s) => s.user_status === 'cannot_create').length
    const pending = suggestions.filter((s) => !s.user_status || s.user_status === 'pending').length

    console.log('[Stats Recalculated]', { total, created, cannot_create, pending })

    return { total, created, cannot_create, pending }
  }, [suggestions])

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

  // Filter suggestions based on current filters
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (filters.pic && s.pic !== filters.pic) return false
      if (filters.product.length > 0 && !filters.product.includes(s.product)) return false
      if (filters.pipeline_created !== null && !!s.pipeline_created !== filters.pipeline_created) return false
      if (filters.quarter && s.quarter !== filters.quarter) return false
      return true
    })
  }, [suggestions, filters])

  async function loadFocus() {
    try {
      console.log('[loadFocus] Fetching focus:', focusId)
      const response = await fetch(`/api/focus-of-month/${focusId}`)

      if (!response.ok) {
        // Handle 403 - access denied (user trying to access draft/archived)
        if (response.status === 403) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        console.error('[loadFocus] Response not OK:', response.status, response.statusText)
        setLoading(false)
        return
      }

      const data = await response.json()

      console.log('[loadFocus] API Response status:', data.status)
      console.log('[loadFocus] data.data?.suggestions:', data.data?.suggestions)
      console.log('[loadFocus] Suggestions count:', data.data?.suggestions?.length || 0)

      if (data.status === 'ok') {
        setFocus(data.data)
        setSuggestions(data.data.suggestions || [])
      } else {
        console.error('[loadFocus] API returned error:', data.message || data.error)
      }
    } catch (error) {
      console.error('[loadFocus] Error loading focus:', error)
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
      <PipelinePageLayout
        title={<span>Loading...</span>}
        showBackButton
        onBackButtonClick={() => router.push('/pipelines/focus')}
      >
        <FocusDetailSkeleton />
      </PipelinePageLayout>
    )
  }

  if (accessDenied) {
    return (
      <PipelinePageLayout
        title="Access Denied"
        showBackButton
        onBackButtonClick={() => router.push('/pipelines/focus')}
      >
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">You can only view published focuses.</p>
          <Button variant="outline" onClick={() => router.push('/pipelines/focus')}>
            Back to Focus List
          </Button>
        </div>
      </PipelinePageLayout>
    )
  }

  if (!focus) {
    return (
      <PipelinePageLayout
        title="Focus Not Found"
        showBackButton
        onBackButtonClick={() => router.push('/pipelines/focus')}
      >
        <div className="text-center py-12">
          <p className="text-muted-foreground">Focus not found</p>
        </div>
      </PipelinePageLayout>
    )
  }

  // Build title with badge
  const titleWithBadge = (
    <>
      {focus.title}
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
    </>
  )

  return (
    <PipelinePageLayout
      title={titleWithBadge}
      subtitle={focus.description || 'No description'}
      showBackButton
      onBackButtonClick={() => router.push('/pipelines/focus')}
      headerActions={
        canManage ? (
          <>
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
          </>
        ) : null
      }
      contentClassName="!pt-0"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-lg border p-4">
        <StatCard
          label="Total Suggestions"
          value={stats.total}
          icon={<Clock className={`h-5 w-5 ${colors.text.muted}`} />}
          valueColor={colors.text.primary}
        />
        <StatCard
          label="Created"
          value={stats.created}
          icon={<CheckCircle className="h-5 w-5" style={{ color: statusColors.status.success }} />}
          valueStyle={{ color: statusColors.status.success }}
        />
        <StatCard
          label="Cannot Create"
          value={stats.cannot_create}
          icon={<XCircle className="h-5 w-5" style={{ color: statusColors.status.danger }} />}
          valueStyle={{ color: statusColors.status.danger }}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className={`h-5 w-5 ${colors.text.muted}`} />}
          valueColor={colors.text.secondary}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-lg">
        <div className="flex gap-4 px-4">
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

      {/* Filter Container - only show for Suggestions tab */}
      {activeTab === 'Suggestions' && (
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-end">
            {/* PIC Filter */}
            <Select value={filters.pic || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, pic: v === 'all' ? null : v }))}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="PIC" />
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

            {/* Product Filter */}
            <Select
              value={filters.product.length === 0 ? 'all' : filters.product.join(',')}
              onValueChange={(v) => setFilters((f) => ({ ...f, product: v === 'all' ? [] : v.split(',') }))}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Product" />
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

            {/* Pipeline Filter */}
            <Select
              value={filters.pipeline_created === null ? 'all' : filters.pipeline_created ? 'yes' : 'no'}
              onValueChange={(v) => setFilters((f) => ({ ...f, pipeline_created: v === 'all' ? null : v === 'yes' }))}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>

            {/* Quarter Filter */}
            <Select value={filters.quarter || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, quarter: v === 'all' ? null : v }))}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" key="quarter-all">All Quarters</SelectItem>
                {generateQuarters(3).map((q) => (
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
              onClick={() => setFilters({ pic: null, product: [], pipeline_created: null, quarter: null })}
            >
              Clear Filters
            </Button>

            {/* Count Badge */}
            <Badge variant="secondary" className="ml-auto">
              {filteredSuggestions.length} / {suggestions.length}
            </Badge>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className={`${colors.background.card} rounded-lg border`}>
        {activeTab === 'Suggestions' && (
          <FocusSuggestionsTable
            suggestions={filteredSuggestions}
            onUpdateStatus={updateSuggestionStatus}
            onOpenPipelineDrawer={handleOpenPipelineDrawer}
            onDeleteSuggestion={handleDeleteSuggestion}
            onDeleteSuccess={(deletedIds) => {
              setSuggestions((prev) => prev.filter((s) => !deletedIds.includes(s.id)))
            }}
            onRemarkUpdate={(mid, product, newRemark) => {
              setSuggestions((prev) =>
                prev.map((s) =>
                  s.mid === mid && s.product === product
                    ? { ...s, global_remark: newRemark }
                    : s
                )
              )
            }}
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
    </PipelinePageLayout>
  )
}

function StatCard({
  label,
  value,
  icon,
  valueColor = colors.text.primary,
  valueStyle,
}: {
  label: string
  value: number
  icon: React.ReactNode
  valueColor?: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div className={`${colors.background.card} rounded-lg border ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm ${colors.text.muted}`}>{label}</span>
        {icon}
      </div>
      <p
        style={{
          fontSize: typography.sizes.metricValue,
          ...(valueStyle && { color: valueStyle.color })
        }}
        className={`font-bold ${valueColor}`}
      >
        {value}
      </p>
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
