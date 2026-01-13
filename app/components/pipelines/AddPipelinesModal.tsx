'use client'

/**
 * Add Pipelines Modal
 * Modal for filtering and selecting pipelines to add to Focus
 */

import { useState, useEffect } from 'react'
import { Plus, Filter as FilterIcon, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateRangePicker } from '../forms/DateRangePicker'
import { SimplifiedFilterModal } from '../performance-tracker/SimplifiedFilterModal'
import { PipelineSelectorTable } from './PipelineSelectorTable'
import type { SimplifiedFilter } from '@/lib/types/performanceTracker'
import { subDays, format } from 'date-fns'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'

interface FilterPipelineResult {
  pid: number
  pubname: string
  mid: number
  medianame: string
  pic: string
  targeted_product: string // Single product being targeted
  rev_p1: number
  req_p1: number
  paid_p1: number
  ecpm_p1: number
  already_in_focus: boolean
  has_active_pipeline: boolean
}

interface AddPipelinesModalProps {
  focusId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Helper to get last month's date range
function getLastMonthRange() {
  const today = new Date()
  const endDate = subDays(today, 1) // Yesterday
  const startDate = subDays(endDate, 29) // 30 days ago
  return { startDate, endDate }
}

export function AddPipelinesModal({
  focusId,
  isOpen,
  onClose,
  onSuccess,
}: AddPipelinesModalProps) {
  // Filter state
  const [filter, setFilter] = useState<SimplifiedFilter>({
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND',
  })
  const [showFilterModal, setShowFilterModal] = useState(false)

  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [products, setProducts] = useState<Array<{label: string, value: string}>>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  // Team selection state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [teams, setTeams] = useState<Array<{label: string, value: string}>>([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  // PIC selection state
  const [selectedPic, setSelectedPic] = useState<string | null>(null)
  const [pics, setPics] = useState<Array<{label: string, value: string}>>([])
  const [loadingPics, setLoadingPics] = useState(false)
  const [picPopoverOpen, setPicPopoverOpen] = useState(false)

  // Fetch products, teams, and pics on mount
  useEffect(() => {
    async function loadMetadata() {
      setLoadingProducts(true)
      setLoadingTeams(true)
      setLoadingPics(true)

      try {
        const [productsResponse, teamsResponse, picsResponse] = await Promise.all([
          fetch('/api/focus-of-month/metadata/products'),
          fetch('/api/focus-of-month/metadata/teams'),
          fetch('/api/focus-of-month/metadata/pics')
        ])

        const productsData = await productsResponse.json()
        const teamsData = await teamsResponse.json()
        const picsData = await picsResponse.json()

        if (productsData.status === 'ok') {
          setProducts(productsData.data)
        } else {
          console.error('Failed to load products:', productsData.message)
        }

        if (teamsData.status === 'ok') {
          setTeams(teamsData.data)
        } else {
          console.error('Failed to load teams:', teamsData.message)
        }

        if (picsData.status === 'ok') {
          setPics(picsData.data)
        } else {
          console.error('Failed to load PICs:', picsData.message)
        }
      } catch (error) {
        console.error('Error loading metadata:', error)
      } finally {
        setLoadingProducts(false)
        setLoadingTeams(false)
        setLoadingPics(false)
      }
    }
    loadMetadata()
  }, [])

  // Date range state
  const { startDate: defaultStart, endDate: defaultEnd } = getLastMonthRange()
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart)
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEnd)

  // Results state
  const [results, setResults] = useState<FilterPipelineResult[]>([])
  const [selectedMids, setSelectedMids] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  // Metadata for filter builder (can be loaded from API if needed)
  const [metadata] = useState<any>({
    pics: [],
    teams: [],
    products: [],
    // Add more metadata as needed
  })

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResults([])
      setSelectedMids(new Set())
      setError(null)
      setResultMessage(null)
      setSelectedProduct(null) // Clear product selection
    }
  }, [isOpen])

  // Apply filter and fetch results
  const handleApplyFilter = async () => {
    if (!startDate || !endDate) {
      setError('Please select a date range')
      return
    }
    if (!selectedProduct) {
      setError('Please select a product to target')
      return
    }

    setLoading(true)
    setError(null)
    setResultMessage(null)

    try {
      const response = await fetch('/api/focus-of-month/filter-pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRange: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          },
          simplifiedFilter: filter.clauses.length > 0 ? filter : undefined,
          focusId, // For duplicate detection
          targetedProduct: selectedProduct,
          team: selectedTeam, // NEW
          pic: selectedPic,   // NEW
        }),
      })

      const data = await response.json()

      if (data.status === 'ok') {
        setResults(data.data || [])
        setResultMessage(data.message || null)
        setSelectedMids(new Set()) // Reset selection
      } else {
        setError(data.message || 'Failed to filter pipelines')
      }
    } catch (err) {
      console.error('Error filtering pipelines:', err)
      setError('Failed to filter pipelines. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Add selected pipelines to focus
  const handleAddSelected = async () => {
    if (selectedMids.size === 0) {
      setError('Please select at least one pipeline')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get selected results
      const selectedResults = results.filter((r) => selectedMids.has(r.mid))

      // Map to suggestions format
      const suggestions = selectedResults.map((result) => ({
        pid: result.pid?.toString() || null,
        mid: result.mid.toString(),
        product: result.targeted_product, // Use the targeted product
        media_name: result.medianame || null,
        publisher_name: result.pubname || null,
        pic: result.pic || null,
        last_30d_requests: result.req_p1 || null,
        thirty_day_avg_revenue: result.rev_p1 || null,
        query_lab_data: {
          filtered_at: new Date().toISOString(),
          date_range: {
            startDate: format(startDate!, 'yyyy-MM-dd'),
            endDate: format(endDate!, 'yyyy-MM-dd'),
          },
          ecpm: result.ecpm_p1,
          revenue: result.rev_p1,
          requests: result.req_p1,
          paid_impressions: result.paid_p1,
        },
      }))

      // Call API to add suggestions
      const response = await fetch(`/api/focus-of-month/${focusId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions,
        }),
      })

      const data = await response.json()

      if (data.status === 'ok') {
        onSuccess() // Close modal and refresh parent
      } else {
        setError(data.message || 'Failed to add pipelines')
      }
    } catch (err) {
      console.error('Error adding pipelines:', err)
      setError('Failed to add pipelines. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Generate filter summary text
  const getFilterSummary = () => {
    if (filter.clauses.length === 0) {
      return 'No filters applied'
    }

    const clauseText = filter.clauses
      .filter((c) => c.enabled)
      .map((c) => `${c.field} ${c.operator} ${Array.isArray(c.value) ? c.value.join(', ') : c.value}`)
      .join(` ${filter.clauseLogic} `)

    return `${filter.includeExclude}: (${clauseText})`
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: typography.sizes.sectionTitle }} className={composedStyles.sectionTitle}>
              Add Pipelines to Focus
            </DialogTitle>
            <DialogDescription className={colors.text.secondary}>
              Filter BigQuery data to find pipelines and add them as suggestions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date Range Picker */}
            <div className={`${colors.background.muted} border border-gray-200 rounded-lg ${spacing.cardPadding}`}>
              <h3 className={`text-sm font-medium ${colors.text.secondary} mb-2`}>Date Range</h3>
              <div className="flex items-center gap-2">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            </div>

            {/* Product Selector - REQUIRED with Search */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Select Product to Target *
              </h3>
              <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productPopoverOpen}
                    className="w-full justify-between bg-white"
                    disabled={loadingProducts}
                  >
                    {selectedProduct
                      ? products.find((p) => p.value === selectedProduct)?.label
                      : loadingProducts
                      ? "Loading products..."
                      : "Choose a product..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        <div className="max-h-[200px] overflow-y-auto">
                          {products.map((product) => (
                            <CommandItem
                              key={product.value}
                              value={product.value}
                              onSelect={(currentValue) => {
                                setSelectedProduct(currentValue)
                                setProductPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedProduct === product.value ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              {product.label}
                            </CommandItem>
                          ))}
                        </div>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-blue-700 mt-2">
                This will show MIDs that don&apos;t have{' '}
                <strong>{selectedProduct || 'this product'}</strong> yet. You can add
                different products in multiple batches to the same Focus.
              </p>
            </div>

            {/* Team Selector - Optional */}
            <div className={`${colors.background.muted} border border-gray-200 rounded-lg ${spacing.cardPadding}`}>
              <h3 className={`text-sm font-medium ${colors.text.secondary} mb-2`}>Team (Optional)</h3>
              <Select
                value={selectedTeam || 'all'}
                onValueChange={(value) => setSelectedTeam(value === 'all' ? null : value)}
                disabled={loadingTeams}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={loadingTeams ? "Loading teams..." : "All teams"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.value} value={team.value}>
                      {team.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PIC Selector - Optional with Search */}
            <div className={`${colors.background.muted} border border-gray-200 rounded-lg ${spacing.cardPadding}`}>
              <h3 className={`text-sm font-medium ${colors.text.secondary} mb-2`}>PIC (Optional)</h3>
              <Popover open={picPopoverOpen} onOpenChange={setPicPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={picPopoverOpen}
                    className="w-full justify-between bg-white"
                    disabled={loadingPics}
                  >
                    {selectedPic
                      ? selectedPic
                      : loadingPics
                      ? "Loading PICs..."
                      : "All PICs"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search PICs..." />
                    <CommandList>
                      <CommandEmpty>No PIC found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setSelectedPic(null)
                            setPicPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedPic === null ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          All PICs
                        </CommandItem>
                        <div className="max-h-[200px] overflow-y-auto">
                          {pics.map((pic) => (
                            <CommandItem
                              key={pic.value}
                              value={pic.value}
                              onSelect={(currentValue) => {
                                setSelectedPic(currentValue)
                                setPicPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedPic === pic.value ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              {pic.label}
                            </CommandItem>
                          ))}
                        </div>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Advanced Filters */}
            <div className={`${colors.background.muted} border border-gray-200 rounded-lg ${spacing.cardPadding}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${colors.text.secondary}`}>Advanced Filters</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterModal(true)}
                >
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Edit Filters
                  {filter.clauses.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                      {filter.clauses.filter((c) => c.enabled).length} active
                    </span>
                  )}
                </Button>
              </div>
              {filter.clauses.length > 0 && (
                <p className={`text-xs ${colors.text.secondary} mt-2 font-mono`}>
                  {getFilterSummary()}
                </p>
              )}
            </div>

            {/* Apply Filter Button */}
            <Button
              onClick={handleApplyFilter}
              disabled={loading || !startDate || !endDate || !selectedProduct}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Filtering...
                </>
              ) : (
                <>
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Apply Filter
                </>
              )}
            </Button>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Result Message */}
            {resultMessage && (
              <Alert>
                <AlertDescription>{resultMessage}</AlertDescription>
              </Alert>
            )}

            {/* Results Table */}
            {results.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Results ({results.length})
                </h3>
                <PipelineSelectorTable
                  results={results}
                  selectedMids={selectedMids}
                  onSelectionChange={setSelectedMids}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={loading || selectedMids.size === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Selected ({selectedMids.size})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simplified Filter Modal */}
      <SimplifiedFilterModal
        open={showFilterModal}
        onOpenChange={(open) => !open && setShowFilterModal(false)}
        filter={filter}
        onFilterChange={setFilter}
        onApply={() => setShowFilterModal(false)}
        metadata={metadata}
      />
    </>
  )
}
