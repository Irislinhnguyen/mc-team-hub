'use client'

export const dynamic = 'force-dynamic'

/**
 * Pipelines Page - Flat Architecture
 * Displays Sales and CS pipeline groups with inline Kanban boards
 * Each pipeline = 1 opportunity (no container model)
 */

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { usePipeline } from '@/app/contexts/PipelineContext'
import { usePipelines } from '@/lib/hooks/queries/usePipelines'
import { usePipelineMetadata } from '@/lib/hooks/queries/usePipelineMetadata'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RefreshCw, Settings } from 'lucide-react'
import type { Pipeline, PipelineGroup } from '@/lib/types/pipeline'
import {
  POC_NAMES,
  CLASSIFICATION_TYPES,
  PRODUCT_TYPES,
  PIPELINE_STAGES,
} from '@/lib/types/pipeline'
import { GroupTabs } from '@/app/components/pipelines/GroupTabs'
import { PipelineKanban } from '@/app/components/pipelines/PipelineKanban'
import {
  PipelineFilterPanelSkeleton,
  PipelineStatsCardsSkeleton,
  RevenueForecastTableSkeleton,
  ActionItemsTableSkeleton,
  SConfirmationTableSkeleton,
  MissingPidMidTableSkeleton,
  PipelineImpactTableSkeleton,
  KanbanBoardSkeleton
} from '@/app/components/pipelines/skeletons'
import { PipelineDetailDrawer } from '@/app/components/pipelines/PipelineDetailDrawer'
import { SalesCycleCard } from '@/app/components/pipelines/SalesCycleCard'
import { NewPipelinesCard } from '@/app/components/pipelines/NewPipelinesCard'
import { SimpleDataTable } from '@/app/components/pipelines/SimpleDataTable'
import { RevenueForecastTable } from '@/app/components/pipelines/RevenueForecastTable'
import { SConfirmationTable } from '@/app/components/pipelines/SConfirmationTable'
import { MissingPidMidTable } from '@/app/components/pipelines/MissingPidMidTable'
import { PipelineImpactTable } from '@/app/components/pipelines/PipelineImpactTable'
import { PipelineReportCard } from '@/app/components/pipelines/PipelineReportCard'
import { FilterPanel } from '@/app/components/pipelines/FilterPanel'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { colors as statusColors } from '@/lib/colors'
import { formatDateShort } from '@/lib/utils/dateHelpers'
import { daysBetween } from '@/lib/utils/dateHelpers'
import { getQuarterFromDate, isDateInQuarter } from '@/lib/utils/quarterHelpers'

function PipelinesPageSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 sticky top-0" style={{ padding: '16px 24px', zIndex: 60 }}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex-1 flex justify-center">
              <Skeleton className="h-10 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto py-8 space-y-6">
        {/* Filters Skeleton */}
        <PipelineFilterPanelSkeleton />

        {/* Stats Cards Skeleton */}
        <div className="mb-8">
          <div className="grid gap-4 md:grid-cols-4">
            <PipelineStatsCardsSkeleton />
          </div>
        </div>

        {/* Revenue Forecast Skeleton */}
        <div className="mb-8">
          <RevenueForecastTableSkeleton />
        </div>

        {/* Kanban Board Skeleton */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Pipeline Board</h2>
          <KanbanBoardSkeleton />
        </div>

        {/* Action Items Skeleton */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Action Items</h2>
          <div className="mb-6">
            <ActionItemsTableSkeleton />
          </div>
          <SConfirmationTableSkeleton />
          <div className="mt-6">
            <MissingPidMidTableSkeleton />
          </div>
          <div className="mt-6">
            <PipelineImpactTableSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelinesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // State
  const [activeGroup, setActiveGroup] = useState<PipelineGroup>('sales')

  // Data fetching via React Query - Load ALL pipelines
  const { pipelines, loading: pipelinesLoading, error: queryError, refetch } = usePipelines(activeGroup, { loadAll: true })

  // Mutations via Context
  const { updatePipeline, error: mutationError, clearError } = usePipeline()

  // Consolidated error
  const error = queryError || mutationError
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterPICs, setFilterPICs] = useState<string[]>([])
  const [filterProducts, setFilterProducts] = useState<string[]>([])
  const [filterSlotTypes, setFilterSlotTypes] = useState<string[]>([]) // Slot type filter: 'new' | 'existing'
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]) // Status filter

  // Team filter states
  const [filterTeams, setFilterTeams] = useState<string[]>([]) // Multi-select team filter

  // Time filter states - Quarter and Year
  // Get most recent quarterly sheet for default filter instead of current quarter
  const [filterYear, setFilterYear] = useState<number>(2025)  // Fallback defaults
  const [filterQuarter, setFilterQuarter] = useState<number>(4)  // Fallback defaults

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch most recent quarterly sheet for default filter
  useEffect(() => {
    async function fetchDefaultQuarter() {
      try {
        const response = await fetch('/api/pipelines/quarterly-sheets')
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          // API already sorts by year DESC, quarter DESC - use first sheet
          const latestSheet = data.data[0]
          setFilterYear(latestSheet.year)
          setFilterQuarter(latestSheet.quarter)
        }
      } catch (error) {
        console.error('Failed to fetch default quarter:', error)
        // Keep fallback defaults if fetch fails
      }
    }
    fetchDefaultQuarter()
  }, [])

  // Load team metadata and POC names via React Query hook
  // Cached for 24 hours (metadata rarely changes)
  // First load: 300-500ms, subsequent loads: 0ms (instant)
  const { metadata } = usePipelineMetadata()
  const teams = metadata.teams
  const pocNames = metadata.pocNames
  const pocTeamMap = metadata.pocTeamMapping
  const teamToPicMap = metadata.teamToPicMapping

  // Initialize from URL params
  useEffect(() => {
    const urlGroup = searchParams.get('group') as PipelineGroup | null
    if (urlGroup && ['sales', 'cs'].includes(urlGroup)) {
      setActiveGroup(urlGroup)
    }
  }, [searchParams])

  // Filter pipelines by active group (already filtered by API, but keep for safety)
  const groupPipelines = useMemo(() => {
    return pipelines.filter((p) => p.group === activeGroup)
  }, [pipelines, activeGroup])

  // Get unique teams, PICs, products for filter dropdowns
  const uniqueTeams = useMemo(() => {
    const teams = new Set(groupPipelines.map(p => p.team).filter(Boolean))
    return Array.from(teams).sort()
  }, [groupPipelines])

  const uniquePICs = useMemo(() => {
    const pics = new Set(groupPipelines.map(p => p.poc).filter(Boolean))
    return Array.from(pics).sort()
  }, [groupPipelines])

  const uniqueProducts = useMemo(() => {
    const products = new Set(
      groupPipelines.flatMap(p =>
        p.product ? p.product.split(',').map(prod => prod.trim()) : []
      )
    )
    return Array.from(products).sort()
  }, [groupPipelines])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(groupPipelines.map(p => p.status).filter(Boolean))
    return Array.from(statuses).sort()
  }, [groupPipelines])

  // Filter pipelines by active group and filters
  const filteredPipelines = useMemo(() => {
    let filtered = groupPipelines

    // Quarter and Year filter - based on fiscal_year and fiscal_quarter
    // Each pipeline belongs to the quarter of its quarterly sheet
    if (filterYear && filterQuarter) {
      filtered = filtered.filter(p => {
        // Filter by fiscal year and quarter from quarterly sheet
        return p.fiscal_year === filterYear && p.fiscal_quarter === filterQuarter
      })
    }

    if (filterTeam) {
      filtered = filtered.filter(p => p.team === filterTeam)
    }

    // PIC filter - multi-select
    if (filterPICs.length > 0) {
      filtered = filtered.filter(p => p.poc && filterPICs.includes(p.poc))
    }

    // Product filter - multi-select
    if (filterProducts.length > 0) {
      filtered = filtered.filter(p =>
        p.product &&
        p.product.split(',').map(s => s.trim()).some(prod => filterProducts.includes(prod))
      )
    }

    // Team filter (POC-based) - use forward mapping like Business Health
    if (filterTeams.length > 0) {
      // Build set of valid POCs from selected teams (efficient: O(1) lookup)
      const validPocs = new Set<string>()
      filterTeams.forEach(teamId => {
        const picsForTeam = teamToPicMap[teamId] || []
        console.log(`[Team Filter] Team ${teamId} has ${picsForTeam.length} POCs:`, picsForTeam)
        picsForTeam.forEach(pic => validPocs.add(pic))
      })

      console.log('[Team Filter] Valid POCs from selected teams:', Array.from(validPocs))

      // Filter pipelines by POC
      const beforeCount = filtered.length
      filtered = filtered.filter(p => {
        if (!p.poc) return false  // Skip pipelines without POC
        return validPocs.has(p.poc)  // O(1) lookup
      })
      console.log(`[Team Filter] Pipelines: ${beforeCount} → ${filtered.length}`)
    }

    // Slot Type filter
    if (filterSlotTypes.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.classification) return false
        const isNewSlot = p.classification === 'New Unit (New Slot)'
        const slotType = isNewSlot ? 'new' : 'existing'
        return filterSlotTypes.includes(slotType)
      })
    }

    // Status filter
    if (filterStatuses.length > 0) {
      filtered = filtered.filter(p => p.status && filterStatuses.includes(p.status))
    }

    return filtered
  }, [groupPipelines, filterYear, filterQuarter, filterTeam, filterPICs, filterProducts, filterTeams, filterSlotTypes, filterStatuses, pocTeamMap])

  // Calculate stats for filtered pipelines (respects team filter)
  const groupStats = useMemo(() => {
    const total_pipelines = filteredPipelines.length
    const total_gross = filteredPipelines.reduce((sum, p) => sum + (p.q_gross || 0), 0)
    const total_net = filteredPipelines.reduce((sum, p) => sum + (p.q_net_rev || 0), 0)

    // Sales Cycle: Average days from proposal to acceptance for Won pipelines
    const wonPipelines = filteredPipelines.filter(p => p.status === '【S】' || p.status === '【S-】')
    const cyclesWithDates = wonPipelines
      .filter(p => p.proposal_date && p.acceptance_date)
      .map(p => {
        const proposal = new Date(p.proposal_date!)
        const acceptance = new Date(p.acceptance_date!)
        const diffTime = Math.abs(acceptance.getTime() - proposal.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      })
    const avg_sales_cycle = cyclesWithDates.length > 0
      ? Math.round(cyclesWithDates.reduce((a, b) => a + b, 0) / cyclesWithDates.length)
      : null

    // New Pipelines: Created since start of current quarter
    const quarterStart = (() => {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      if (month >= 4 && month <= 6) return new Date(year, 3, 1)
      if (month >= 7 && month <= 9) return new Date(year, 6, 1)
      if (month >= 10 && month <= 12) return new Date(year, 9, 1)
      return new Date(year, 0, 1)
    })()
    const new_pipelines = filteredPipelines.filter(p =>
      new Date(p.created_at) >= quarterStart
    ).length

    return { total_pipelines, total_gross, total_net, avg_sales_cycle, new_pipelines }
  }, [filteredPipelines])

  // Calculate overdue pipelines (respects team filter)
  const overduePipelines = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return filteredPipelines.filter(p => {
      if (!p.starting_date) return false
      const startDate = new Date(p.starting_date)
      startDate.setHours(0, 0, 0, 0)
      const isOverdue = startDate <= today
      const notClosed = !['【S】', '【S-】', '【Z】'].includes(p.status)
      return isOverdue && notClosed
    }).map(p => ({
      ...p,
      days_overdue: daysBetween(p.starting_date!, new Date())
    })).sort((a, b) => b.days_overdue - a.days_overdue)
  }, [filteredPipelines])

  // Calculate next actions (pipelines with action_date in next 30 days, respects team filter)
  const nextActions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30Days = new Date(today)
    in30Days.setDate(today.getDate() + 30)
    in30Days.setHours(23, 59, 59, 999)

    return filteredPipelines.filter(p => {
      if (!p.action_date) return false
      const actionDate = new Date(p.action_date)
      actionDate.setHours(0, 0, 0, 0)
      return actionDate >= today && actionDate <= in30Days
    }).map(p => ({
      ...p,
      days_until: daysBetween(new Date(), p.action_date!)
    })).sort((a, b) => a.days_until - b.days_until)
  }, [filteredPipelines])

  // Count pipelines per group
  const salesCount = pipelines.filter((p) => p.group === 'sales').length
  const csCount = pipelines.filter((p) => p.group === 'cs').length

  // Update URL when group changes
  const updateUrl = (group: PipelineGroup) => {
    window.history.pushState({}, '', `/pipelines?group=${group}`)
  }

  // Handle group change
  const handleGroupChange = (group: PipelineGroup) => {
    setActiveGroup(group)
    updateUrl(group)
  }

  // Handle pipeline update (from Kanban drag)
  const handlePipelineUpdate = async (pipelineId: string, updates: Partial<Pipeline>) => {
    await updatePipeline(pipelineId, updates)
  }

  // Handle pipeline click - Open detail drawer
  const handlePipelineClick = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline)
    setDrawerOpen(true)
  }

  // Handle pipeline save from drawer
  const handlePipelineSave = async (updates: Partial<Pipeline>) => {
    if (!selectedPipeline) return

    try {
      // Save to API and get updated pipeline
      const updatedPipeline = await updatePipeline(selectedPipeline.id, updates)

      // Wait for React Query to refetch and update cache
      await refetch()

      // Update local state with the fresh data from API
      setSelectedPipeline(updatedPipeline)
    } catch (error) {
      console.error('Failed to save pipeline:', error)
      throw error  // Re-throw so drawer can handle it
    }
  }

  // Handle refresh data - Invalidate cache and refetch
  const handleRefreshData = async () => {
    setIsRefreshing(true)
    try {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      await refetch()
      toast({
        title: 'Data refreshed',
        description: 'Pipeline data has been reloaded from the database.',
      })
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast({
        title: 'Refresh failed',
        description: 'Failed to reload pipeline data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0" style={{ padding: '16px 24px', zIndex: 60 }}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section - Title */}
            <h1 className="text-2xl font-bold text-[#1565C0]">Sales Pipelines</h1>

            {/* Center Section - Group Tabs */}
            <div className="flex-1 flex justify-center">
              <GroupTabs
                activeGroup={activeGroup}
                onGroupChange={handleGroupChange}
                salesCount={salesCount}
                csCount={csCount}
              />
            </div>

            {/* Right Section - Refresh Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">{error instanceof Error ? error.message : String(error)}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Loading State or Content */}
        {pipelinesLoading ? (
          <div className="space-y-6">
            {/* Filters Skeleton */}
            <PipelineFilterPanelSkeleton />

            {/* Stats Cards Skeleton */}
            <div className="mb-8">
              <div className="grid gap-4 md:grid-cols-4">
                <PipelineStatsCardsSkeleton />
              </div>
            </div>

            {/* Revenue Forecast Skeleton */}
            <div className="mb-8">
              <RevenueForecastTableSkeleton />
            </div>

            {/* Kanban Board Skeleton */}
            <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Pipeline Board</h2>
            <KanbanBoardSkeleton />
          </div>

          {/* Action Items Skeleton */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Action Items</h2>
            <div className="mb-6">
              <ActionItemsTableSkeleton />
            </div>
            <SConfirmationTableSkeleton />
            <div className="mt-6">
              <MissingPidMidTableSkeleton />
            </div>
            <div className="mt-6">
              <PipelineImpactTableSkeleton />
            </div>
          </div>
        </div>
      ) : !pipelines || pipelines.length === 0 ? (
        /* Empty State - No pipelines at all */
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">
            No pipelines yet
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Pipelines are managed via Google Sheets. Register a quarterly sheet to sync your data.
          </p>
          <Link href="/pipelines/sheet-config">
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Manage Quarterly Sheets
            </Button>
          </Link>
        </div>
      ) : groupPipelines.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">
            No pipelines in {activeGroup === 'sales' ? 'Sales' : 'CS'} group yet
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Pipelines are managed via Google Sheets. Add pipelines to your quarterly sheet and sync.
          </p>
          <Link href="/pipelines/sheet-config">
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Manage Quarterly Sheets
            </Button>
          </Link>
        </div>
      ) : (
        /* Main Content - Kanban Board */
        <>
          {/* Filters Section */}
          <div className="mb-6">
            <FilterPanel
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              filterQuarter={filterQuarter}
              setFilterQuarter={setFilterQuarter}
              teams={teams}
              filterTeams={filterTeams}
              setFilterTeams={setFilterTeams}
              uniquePICs={uniquePICs}
              filterPICs={filterPICs}
              setFilterPICs={setFilterPICs}
              uniqueProducts={uniqueProducts}
              filterProducts={filterProducts}
              setFilterProducts={setFilterProducts}
              filterSlotTypes={filterSlotTypes}
              setFilterSlotTypes={setFilterSlotTypes}
              uniqueStatuses={uniqueStatuses}
              filterStatuses={filterStatuses}
              setFilterStatuses={setFilterStatuses}
              filteredCount={filteredPipelines.length}
              totalCount={groupPipelines.length}
              onClear={() => {
                setFilterTeam('')
                setFilterPICs([])
                setFilterProducts([])
                setFilterTeams([])
                setFilterSlotTypes([])
                setFilterStatuses([])
                // Reset to current quarter and year
                setFilterYear(currentYear)
                setFilterQuarter(currentQuarter)
              }}
            />
          </div>

          {/* Stats Cards */}
          <div className="mb-8">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-gray-50 rounded-lg px-5 py-4">
                <div className="text-xs font-medium text-[#1565C0] uppercase tracking-wide mb-1">
                  Total Pipelines
                </div>
                <div className="text-2xl font-bold text-[#1565C0]">
                  {groupStats.total_pipelines}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-5 py-4">
                <div className="text-xs font-medium text-[#1565C0] uppercase tracking-wide mb-1">
                  Total Gross
                </div>
                <div className="text-2xl font-bold text-[#1565C0]">
                  {formatCurrency(groupStats.total_gross)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-5 py-4">
                <div className="text-xs font-medium text-[#1565C0] uppercase tracking-wide mb-1">
                  Total Net Revenue
                </div>
                <div className="text-2xl font-bold text-[#1565C0]">
                  {formatCurrency(groupStats.total_net)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-5 py-4">
                <div className="text-xs font-medium text-[#1565C0] uppercase tracking-wide mb-1">
                  Avg Sales Cycle
                </div>
                <div className="text-2xl font-bold text-[#1565C0]">
                  {groupStats.avg_sales_cycle !== null ? `${groupStats.avg_sales_cycle}d` : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Forecast Section */}
          <div className="mb-8">
            <RevenueForecastTable pipelines={filteredPipelines} />
          </div>

          {/* Pipeline Board Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Pipeline Board</h2>
            <PipelineKanban
              pipelines={filteredPipelines}
              onPipelineUpdate={handlePipelineUpdate}
              onPipelineClick={handlePipelineClick}
              loading={pipelinesLoading}
            />
          </div>

          {/* Action Items Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#1565C0] mb-4">Action Items</h2>
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <SimpleDataTable
                title={`Overdue Pipelines (${overduePipelines.length})`}
                columns={[
                  {
                    key: 'publisher',
                    label: 'Pipeline',
                    format: (value) => <span className="font-medium">{value || 'Unnamed'}</span>
                  },
                  {
                    key: 'poc',
                    label: 'POC',
                    format: (value) => value || '-'
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    format: (value) => (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        {value}
                      </Badge>
                    )
                  },
                  {
                    key: 'starting_date',
                    label: 'Start Date',
                    format: (value) => value ? formatDateShort(value) : '-'
                  },
                  {
                    key: 'days_overdue',
                    label: 'Overdue',
                    align: 'right',
                    format: (value) => (
                      <span className="font-bold" style={{ color: statusColors.status.danger }}>{value}d</span>
                    )
                  }
                ]}
                data={overduePipelines}
                onRowClick={(row) => handlePipelineClick(row)}
                maxHeight="400px"
              />
              <SimpleDataTable
                title={`Next Actions (30 days) - ${nextActions.length}`}
                columns={[
                  {
                    key: 'publisher',
                    label: 'Pipeline',
                    format: (value) => <span className="font-medium">{value || 'Unnamed'}</span>
                  },
                  {
                    key: 'poc',
                    label: 'POC',
                    format: (value) => value || '-'
                  },
                  {
                    key: 'action_date',
                    label: 'Action Date',
                    format: (value) => value ? formatDateShort(value) : '-'
                  },
                  {
                    key: 'next_action',
                    label: 'Next Action',
                    format: (value) => (
                      <div className="truncate max-w-[200px]" title={value || ''}>
                        {value || '-'}
                      </div>
                    )
                  },
                  {
                    key: 'days_until',
                    label: 'In',
                    align: 'right',
                    format: (value) => (
                      <span
                        className="font-bold"
                        style={{ color: value <= 3 ? statusColors.status.danger : undefined }}
                      >
                        {value}d
                      </span>
                    )
                  }
                ]}
                data={nextActions}
                onRowClick={(row) => handlePipelineClick(row)}
                maxHeight="400px"
              />
            </div>
            <SConfirmationTable
              pipelines={filteredPipelines}
              onConfirmComplete={refetch}
              onPipelineClick={handlePipelineClick}
            />

            {/* Missing PID/MID & Pipeline Report Generator - Side by Side */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <MissingPidMidTable
                pipelines={filteredPipelines}
                onPipelineClick={handlePipelineClick}
              />
              <PipelineReportCard pipelines={filteredPipelines} />
            </div>

            <div className="mt-6">
              <PipelineImpactTable
                filterStatuses={filterStatuses}
                filterPICs={filterPICs}
                filterProducts={filterProducts}
                filterSlotTypes={filterSlotTypes}
                filterTeams={filterTeams}
                activeGroup={activeGroup}
                filterYear={filterYear}
                filterQuarter={filterQuarter}
                onPipelineClick={(pipelineId) => {
                  const pipeline = pipelines.find(p => p.id === pipelineId)
                  if (pipeline) {
                    setSelectedPipeline(pipeline)
                    setDrawerOpen(true)
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Pipeline Detail Drawer */}
      <PipelineDetailDrawer
        pipeline={selectedPipeline}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      </div>
    </div>
  )
}

// Wrapper with Suspense for useSearchParams
function PipelinesPageWrapper() {
  return (
    <Suspense fallback={<PipelinesPageSkeleton />}>
      <PipelinesPageContent />
    </Suspense>
  )
}

export default function PipelinesPage() {
  return <PipelinesPageWrapper />
}
