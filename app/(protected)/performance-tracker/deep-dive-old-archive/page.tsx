'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { CompactFilterPanel } from '../../../components/performance-tracker/CompactFilterPanel'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { CompactZoneCard } from '../../../components/performance-tracker/CompactZoneCard'
import { ProductSegmentedView } from '../../../components/performance-tracker/ProductSegmentedView'
import { SubtleSkeleton } from '../../../components/performance-tracker/SubtleSkeleton'
import { AnalysisPreview } from '../../../components/performance-tracker/AnalysisPreview'
import { MethodologyDialog } from '../../../components/performance-tracker/MethodologyDialog'
import TabNavigation from '../../../components/performance-tracker/TabNavigation'
import { PICAnalysisView } from '../../../components/performance-tracker/PICAnalysisView'
import { PIDAnalysisView } from '../../../components/performance-tracker/PIDAnalysisView'
import { MIDAnalysisView } from '../../../components/performance-tracker/MIDAnalysisView'
import { ProductAnalysisView } from '../../../components/performance-tracker/ProductAnalysisView'
import { TeamAnalysisView } from '../../../components/performance-tracker/TeamAnalysisView'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { colors } from '../../../../lib/colors'
import { highlightAIText } from '../../../../lib/utils/aiHighlighter'
import { RefreshCw, Download, Sparkles, HelpCircle } from 'lucide-react'
import { safeToFixed, safeNumber } from '../../../../lib/utils/formatters'

/**
 * Deep Dive - Product Comparison Analysis
 *
 * Improvements:
 * - Enhanced date range comparison UI with visual indicators
 * - eCPM metrics added to comparison
 * - Collapsible sections by risk level
 * - Structured AI insights with formatting
 */

interface ComparisonData {
  zid: number
  zonename: string
  product?: string // Product name for multi-product analysis
  status: 'new' | 'lost' | 'existing'
  risk_level: 'critical' | 'high' | 'moderate' | 'healthy'

  // Period 1 metrics
  req_p1: number
  rev_p1: number
  ecpm_p1: number
  fill_rate_p1: number

  // Period 2 metrics
  req_p2: number
  rev_p2: number
  ecpm_p2: number
  fill_rate_p2: number

  // Changes
  req_change_pct: number
  rev_change_pct: number
  ecpm_change_pct: number
  fill_rate_change_pct: number

  // Root cause
  root_cause: string
}

interface SummaryMetrics {
  total_zones_p1: number
  total_zones_p2: number
  new_zones: number
  lost_zones: number
  at_risk_critical: number
  at_risk_high: number
  at_risk_moderate: number

  total_req_p1: number
  total_req_p2: number
  req_change_pct: number

  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number

  avg_ecpm_p1: number
  avg_ecpm_p2: number
  ecpm_change_pct: number

  avg_fill_rate_p1: number
  avg_fill_rate_p2: number
  fill_rate_change_pct: number
}

function DeepDivePageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ComparisonData[] | null>(null)
  const [summary, setSummary] = useState<SummaryMetrics | null>(null)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // NEW: Analysis flow control
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'critical')

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabId)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Date range states
  const [period1Start, setPeriod1Start] = useState('')
  const [period1End, setPeriod1End] = useState('')
  const [period2Start, setPeriod2Start] = useState('')
  const [period2End, setPeriod2End] = useState('')
  const [activePreset, setActivePreset] = useState('last7vs7')

  // NEW: Perspective state (replaces aggregationLevel)
  const [perspective, setPerspective] = useState<'zone' | 'team' | 'pic' | 'pid' | 'mid' | 'product'>('zone')
  const [perspectiveData, setPerspectiveData] = useState<any[] | null>(null)
  const [perspectiveLoading, setPerspectiveLoading] = useState(false)

  // Filter states
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const { crossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])

  // Initialize with preset: Last 7 days vs Previous 7 days
  useEffect(() => {
    applyPreset('last7vs7')
    // Don't set default product - let user choose
  }, [])

  // Apply cross-filters
  useEffect(() => {
    setCurrentFilters(prev => {
      const cleaned = { ...prev }
      prevCrossFilterFieldsRef.current.forEach(field => {
        delete cleaned[field]
      })

      const newCrossFilterValues = crossFilters.reduce((acc, filter) => {
        if (acc[filter.field]) {
          if (Array.isArray(acc[filter.field])) {
            acc[filter.field].push(filter.value)
          } else {
            acc[filter.field] = [acc[filter.field], filter.value]
          }
        } else {
          acc[filter.field] = filter.value
        }
        return acc
      }, {} as Record<string, any>)

      const newCrossFilterFields = Object.keys(newCrossFilterValues)
      prevCrossFilterFieldsRef.current = newCrossFilterFields

      return { ...cleaned, ...newCrossFilterValues }
    })
  }, [crossFilters])

  // REMOVED: Auto-fetch on filter change
  // Now user must click "Analyze" button to fetch data

  // Re-fetch data when perspective changes (if already analyzed)
  useEffect(() => {
    if (hasAnalyzed && period1Start && period2Start) {
      if (perspective === 'zone') {
        fetchData()
      } else {
        fetchPerspectiveData()
      }
    }
  }, [perspective])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period1: { start: period1Start, end: period1End },
          period2: { start: period2Start, end: period2End },
          filters: currentFilters,
          perspective: perspective
        })
      })

      const result = await response.json()
      if (result.status === 'ok') {
        setData(result.data.zones)
        setSummary(result.data.summary)

        if (result.data.zones.length > 0) {
          fetchAiInsights(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching deep dive data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAiInsights = async (analysisData: any) => {
    setAiLoading(true)
    try {
      // Prepare product context for AI
      const products = currentFilters.product
        ? Array.isArray(currentFilters.product)
          ? currentFilters.product
          : [currentFilters.product]
        : []

      // TODO: AI insights route removed, need to re-implement or disable
      // const response = await fetch('/api/performance-tracker/deep-dive/ai-insights', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     data: analysisData,
      //     context: {
      //       products,
      //       period1: { start: period1Start, end: period1End },
      //       period2: { start: period2Start, end: period2End },
      //       perspective: perspective,
      //       additionalFilters: {
      //         team: currentFilters.team,
      //         pic: currentFilters.pic
      //       }
      //     }
      //   })
      // })

      // const result = await response.json()
      // if (result.status === 'ok') {
      //   setAiInsights(result.insights)
      // }

      // Temporarily disable AI insights
      setAiInsights('AI insights temporarily disabled')
    } catch (error) {
      console.error('Error fetching AI insights:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchPerspectiveData = async () => {
    setPerspectiveLoading(true)
    try {
      // Use unified API endpoint
      const response = await fetch('/api/performance-tracker/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perspective,
          period1: { start: period1Start, end: period1End },
          period2: { start: period2Start, end: period2End },
          filters: currentFilters
        })
      })

      const result = await response.json()
      if (result.status === 'ok') {
        setPerspectiveData(result.data)
      }
    } catch (error) {
      console.error('Error fetching perspective data:', error)
    } finally {
      setPerspectiveLoading(false)
    }
  }

  const applyPreset = (preset: string) => {
    const today = new Date()
    let period2End = new Date(today)
    period2End.setDate(period2End.getDate() - 1)

    let period2Start = new Date(period2End)
    let period1End = new Date()
    let period1Start = new Date()

    switch (preset) {
      case 'last7vs7':
        period2Start.setDate(period2Start.getDate() - 6)
        period1End = new Date(period2Start)
        period1End.setDate(period1End.getDate() - 1)
        period1Start = new Date(period1End)
        period1Start.setDate(period1Start.getDate() - 6)
        break

      case 'last30vs30':
        period2Start.setDate(period2Start.getDate() - 29)
        period1End = new Date(period2Start)
        period1End.setDate(period1End.getDate() - 1)
        period1Start = new Date(period1End)
        period1Start.setDate(period1Start.getDate() - 29)
        break

      case 'thisWeekVsLastWeek': {
        // Get yesterday (last complete day)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        // Period 2: Monday through yesterday (incomplete current week)
        const currentDay = yesterday.getDay()
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
        period2End = new Date(yesterday)
        period2Start = new Date(period2End)
        period2Start.setDate(period2Start.getDate() - daysFromMonday)

        // Period 1: Previous full week (Mon-Sun, 7 days)
        period1End = new Date(period2Start)
        period1End.setDate(period1End.getDate() - 1)
        period1Start = new Date(period1End)
        period1Start.setDate(period1Start.getDate() - 6)
        break
      }

      case 'last28vs28':
        period2Start.setDate(period2Start.getDate() - 27)
        period1End = new Date(period2Start)
        period1End.setDate(period1End.getDate() - 1)
        period1Start = new Date(period1End)
        period1Start.setDate(period1Start.getDate() - 27)
        break

      case 'yesterdayVs30DayAvg':
        // Period 2: Yesterday (single day)
        period2Start = new Date(period2End)

        // Period 1: 30 days before yesterday (for average calculation)
        period1End = new Date(period2Start)
        period1End.setDate(period1End.getDate() - 1)
        period1Start = new Date(period1End)
        period1Start.setDate(period1Start.getDate() - 29)
        break

      case 'thisMonthVsLastMonth': {
        const now = new Date(today)
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // Period 2: This month (from 1st to yesterday)
        period2Start = new Date(currentYear, currentMonth, 1)
        period2End = new Date(today)
        period2End.setDate(period2End.getDate() - 1)

        // Period 1: Last month (full month)
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        period1Start = new Date(lastMonthYear, lastMonth, 1)
        period1End = new Date(currentYear, currentMonth, 0) // Last day of previous month
        break
      }

      case 'yoySamePeriod': {
        // Period 2: Same period this year (start of year to yesterday)
        const now = new Date(today)
        const currentYear = now.getFullYear()
        period2Start = new Date(currentYear, 0, 1) // Jan 1st this year
        period2End = new Date(today)
        period2End.setDate(period2End.getDate() - 1)

        // Period 1: Same period last year
        period1Start = new Date(currentYear - 1, 0, 1) // Jan 1st last year
        period1End = new Date(currentYear - 1, now.getMonth(), now.getDate() - 1)
        break
      }
    }

    setPeriod1Start(period1Start.toISOString().split('T')[0])
    setPeriod1End(period1End.toISOString().split('T')[0])
    setPeriod2Start(period2Start.toISOString().split('T')[0])
    setPeriod2End(period2End.toISOString().split('T')[0])
    setActivePreset(preset)
  }

  // Calculate duration
  const getDaysDiff = (start: string, end: string) => {
    const d1 = new Date(start)
    const d2 = new Date(end)
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const period1Days = period1Start && period1End ? getDaysDiff(period1Start, period1End) : 0
  const period2Days = period2Start && period2End ? getDaysDiff(period2Start, period2End) : 0

  // NEW: Generate natural language preview
  const getPreviewText = () => {
    if (!period1Start || !period2Start) {
      return "Select date ranges to begin analysis"
    }

    // Zone perspective requires product
    if (perspective === 'zone' && (!currentFilters.product ||
        (Array.isArray(currentFilters.product) && currentFilters.product.length === 0))) {
      return "Please select a product to analyze zones"
    }

    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const perspectiveName = perspective === 'team' ? 'Teams' :
                           perspective === 'pic' ? 'Team Members' :
                           perspective === 'pid' ? 'Publishers' :
                           perspective === 'mid' ? 'Media Properties' :
                           perspective === 'product' ? 'Products' : 'Zones'

    if (currentFilters.product && (Array.isArray(currentFilters.product) ? currentFilters.product.length > 0 : true)) {
      const products = Array.isArray(currentFilters.product)
        ? currentFilters.product.join(', ')
        : currentFilters.product
      return `Analyze ${perspectiveName} for ${products} between ${formatDate(period1Start)} - ${formatDate(period1End)} (Period 1) and ${formatDate(period2Start)} - ${formatDate(period2End)} (Period 2)`
    }

    return `Analyze ${perspectiveName} between ${formatDate(period1Start)} - ${formatDate(period1End)} (Period 1) and ${formatDate(period2Start)} - ${formatDate(period2End)} (Period 2)`
  }

  // NEW: Check if analysis can be performed
  const canAnalyze = Boolean(
    period1Start &&
    period1End &&
    period2Start &&
    period2End &&
    (
      // Zone perspective requires product filter
      perspective === 'zone'
        ? (currentFilters.product && (Array.isArray(currentFilters.product) ? currentFilters.product.length > 0 : true))
        : true // Other perspectives don't require product filter
    )
  )

  // NEW: Handle Analyze button click
  const handleAnalyze = async () => {
    if (!canAnalyze) return

    setHasAnalyzed(true)

    // Fetch data based on selected perspective
    if (perspective === 'zone') {
      await fetchData()
    } else {
      await fetchPerspectiveData()
    }
  }


  // Segment data by risk level
  const segmentedData = {
    critical: data?.filter(d => d.risk_level === 'critical') || [],
    high: data?.filter(d => d.risk_level === 'high') || [],
    moderate: data?.filter(d => d.risk_level === 'moderate') || [],
    newZones: data?.filter(d => d.status === 'new') || [],
    lost: data?.filter(d => d.status === 'lost') || [],
    healthy: data?.filter(d => d.risk_level === 'healthy' && d.status === 'existing') || []
  }

  // Enhanced table columns with Product + eCPM
  const getTableColumns = () => [
    { key: 'product', label: 'Product', width: '10%', filterable: true },
    { key: 'zid', label: 'Zone ID', width: '7%', filterable: true },
    { key: 'zonename', label: 'Zone Name', width: '15%', filterable: true },

    // Requests (no filter - all values are unique numbers)
    { key: 'req_p2', label: 'Req (P2)', width: '7%' },
    { key: 'req_p1', label: 'Req (P1)', width: '7%' },
    { key: 'req_change_pct', label: 'Req Δ%', width: '6%' },

    // Revenue (no filter - all values are unique numbers)
    { key: 'rev_p2', label: 'Rev (P2)', width: '7%' },
    { key: 'rev_p1', label: 'Rev (P1)', width: '7%' },
    { key: 'rev_change_pct', label: 'Rev Δ%', width: '6%' },

    // eCPM (no filter - all values are unique numbers)
    { key: 'ecpm_p2', label: 'eCPM (P2)', width: '7%' },
    { key: 'ecpm_p1', label: 'eCPM (P1)', width: '7%' },
    { key: 'ecpm_change_pct', label: 'eCPM Δ%', width: '6%' },

    { key: 'root_cause', label: 'Root Cause', width: '10%', filterable: true }
  ]

  // Prepare table data with formatted values
  const prepareTableData = (zones: ComparisonData[]) => {
    return zones.map(row => {
      // Format change percentages with color indicators
      const formatChange = (changePct: number) => {
        const sign = changePct > 0 ? '+' : ''
        return `${sign}${safeToFixed(changePct, 1)}%`
      }

      return {
        ...row,
        req_change_pct: formatChange(row.req_change_pct),
        rev_change_pct: formatChange(row.rev_change_pct),
        ecpm_change_pct: formatChange(row.ecpm_change_pct),
      }
    })
  }

  return (
    <AnalyticsPageLayout
      title="Deep Dive - Product Comparison Analysis"
      showExport={true}
      contentRef={contentRef}
    >
      <div className="space-y-8 pb-12" ref={contentRef}>
        {/* Perspective Selector */}
        <Card style={{ backgroundColor: 'rgb(249, 250, 251)', border: `1px solid ${colors.border.default}` }}>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: colors.text.primary }}>
                    Analysis Perspective
                  </h3>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    Choose how to analyze your data - each perspective answers different questions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                <button
                  onClick={() => setPerspective('team')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'team' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'team' ? colors.data.primary : colors.text.primary }}>
                    Team
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    Team performance & workload distribution across members
                  </div>
                </button>

                <button
                  onClick={() => setPerspective('pic')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'pic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'pic' ? colors.data.primary : colors.text.primary }}>
                    Team Member (PIC)
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    How is this person performing? Portfolio health & workload
                  </div>
                </button>

                <button
                  onClick={() => setPerspective('pid')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'pid' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'pid' ? colors.data.primary : colors.text.primary }}>
                    Publisher (PID)
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    Upsell opportunities & churn risk by publisher account
                  </div>
                </button>

                <button
                  onClick={() => setPerspective('mid')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'mid' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'mid' ? colors.data.primary : colors.text.primary }}>
                    Media (MID)
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    Zone optimization & saturation analysis by app/website
                  </div>
                </button>

                <button
                  onClick={() => setPerspective('product')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'product' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'product' ? colors.data.primary : colors.text.primary }}>
                    Product
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    Product portfolio analysis & strategic expansion opportunities
                  </div>
                </button>

                <button
                  onClick={() => setPerspective('zone')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    perspective === 'zone' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1" style={{ color: perspective === 'zone' ? colors.data.primary : colors.text.primary }}>
                    Zone Detail
                  </div>
                  <div className="text-xs" style={{ color: colors.text.secondary }}>
                    Granular zone-level comparison & risk analysis
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Filter Panel */}
        <CompactFilterPanel
          period1Start={period1Start}
          period1End={period1End}
          period2Start={period2Start}
          period2End={period2End}
          onPeriod1StartChange={setPeriod1Start}
          onPeriod1EndChange={setPeriod1End}
          onPeriod2StartChange={setPeriod2Start}
          onPeriod2EndChange={setPeriod2End}
          activePreset={activePreset}
          onPresetChange={applyPreset}
          currentFilters={currentFilters}
          onFilterChange={setCurrentFilters}
          canAnalyze={canAnalyze}
          loading={loading}
          onAnalyze={handleAnalyze}
        >
          <MethodologyDialog>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="How are risk levels calculated?">
              <HelpCircle size={16} />
            </Button>
          </MethodologyDialog>
        </CompactFilterPanel>

        {/* Analysis Preview - Only show before analysis */}
        {canAnalyze && !hasAnalyzed && (
          <AnalysisPreview
            previewText={getPreviewText()}
            hasAnalyzed={hasAnalyzed}
            resultsCount={data?.length}
          />
        )}

        {/* Show results only after Analyze is clicked */}
        {hasAnalyzed && (
          <>
            {/* Render perspective-specific views */}
            {perspective === 'team' && (
              <TeamAnalysisView
                data={perspectiveData || []}
                loading={perspectiveLoading}
                period1={{ start: period1Start, end: period1End }}
                period2={{ start: period2Start, end: period2End }}
                filters={currentFilters}
              />
            )}

            {perspective === 'pic' && (
              <PICAnalysisView
                data={perspectiveData || []}
                loading={perspectiveLoading}
                period1={{ start: period1Start, end: period1End }}
                period2={{ start: period2Start, end: period2End }}
                filters={currentFilters}
              />
            )}

            {perspective === 'pid' && (
              <PIDAnalysisView
                data={perspectiveData || []}
                loading={perspectiveLoading}
                period1={{ start: period1Start, end: period1End }}
                period2={{ start: period2Start, end: period2End }}
                filters={currentFilters}
              />
            )}

            {perspective === 'mid' && (
              <MIDAnalysisView
                data={perspectiveData || []}
                loading={perspectiveLoading}
                period1={{ start: period1Start, end: period1End }}
                period2={{ start: period2Start, end: period2End }}
                filters={currentFilters}
              />
            )}

            {perspective === 'product' && (
              <ProductAnalysisView
                data={perspectiveData || []}
                loading={perspectiveLoading}
                period1={{ start: period1Start, end: period1End }}
                period2={{ start: period2Start, end: period2End }}
                filters={currentFilters}
              />
            )}

            {/* Zone Detail View (original logic) */}
            {perspective === 'zone' && (
              <>
                {/* AI Executive Summary */}
                {aiLoading ? (
                  <div className="py-4 px-6 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={18} style={{ color: colors.text.secondary }} />
                      <span className="text-sm font-medium" style={{ color: colors.text.secondary }}>AI Summary</span>
                    </div>
                    <SubtleSkeleton type="text" rows={2} />
                  </div>
                ) : aiInsights ? (
                  <div className="py-4 px-6 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} style={{ color: colors.text.secondary }} />
                        <span className="text-sm font-medium" style={{ color: colors.text.secondary }}>Executive Summary</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                        // TODO: AI insights route removed, temporarily disabled
                        // if (data && summary) {
                        //   setAiLoading(true)
                        //   fetch('/api/performance-tracker/deep-dive/ai-insights', {
                        //     method: 'POST',
                        //     headers: { 'Content-Type': 'application/json' },
                        //     body: JSON.stringify({ data: { zones: data, summary } })
                        //   })
                        //     .then(res => res.json())
                        //     .then(result => {
                        //       if (result.status === 'ok') setAiInsights(result.insights)
                        //     })
                        //     .finally(() => setAiLoading(false))
                        // }
                        setAiInsights('AI insights temporarily disabled')
                      }}>
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: colors.text.primary }} dangerouslySetInnerHTML={{ __html: highlightAIText(aiInsights) }} />
                  </div>
                ) : null}

                {/* Summary Metrics */}
                {loading ? (
                  <SubtleSkeleton type="metrics" columns={5} />
                ) : summary ? (
                  <div className="grid grid-cols-5 gap-3">
                    <MetricCard
                      label="Total Zones"
                      value={summary.total_zones_p2}
                      comparisonValue={summary.total_zones_p1}
                    />
                    <MetricCard
                      label="Total Requests"
                      value={summary.total_req_p2}
                      change={summary.req_change_pct}
                      comparisonValue={summary.total_req_p1}
                    />
                    <MetricCard
                      label="Total Revenue"
                      value={summary.total_rev_p2}
                      change={summary.rev_change_pct}
                      comparisonValue={summary.total_rev_p1}
                    />
                    <MetricCard
                      label="Avg eCPM"
                      value={summary.avg_ecpm_p2}
                      change={summary.ecpm_change_pct}
                      comparisonValue={summary.avg_ecpm_p1}
                    />
                    <MetricCard
                      label="Avg Fill Rate"
                      value={summary.avg_fill_rate_p2}
                      unit="%"
                      change={summary.fill_rate_change_pct}
                      comparisonValue={summary.avg_fill_rate_p1}
                    />
                  </div>
                ) : null}

                {/* Tab Navigation (No Badge Strip - Reduces Visual Noise) */}
                {!loading && summary && (
                  <>
                {/* Determine if we should show Product Summary tab */}
                {(() => {
                  const products = currentFilters.product
                    ? Array.isArray(currentFilters.product)
                      ? currentFilters.product
                      : [currentFilters.product]
                    : []
                  const showProductSummary = products.length > 1

                  const tabs = showProductSummary
                    ? [
                        { id: 'product-summary', label: 'Product Summary', color: colors.text.primary },
                        { id: 'critical', label: 'Critical', count: summary.at_risk_critical, color: colors.status.danger },
                        { id: 'high', label: 'High Risk', count: summary.at_risk_high, color: colors.status.warning },
                        { id: 'moderate', label: 'Moderate', count: summary.at_risk_moderate, color: colors.status.info },
                        { id: 'lost', label: 'Lost Zones', count: summary.lost_zones, color: colors.text.secondary },
                        { id: 'new', label: 'New Zones', count: summary.new_zones, color: colors.status.success },
                      ]
                    : [
                        { id: 'critical', label: 'Critical', count: summary.at_risk_critical, color: colors.status.danger },
                        { id: 'high', label: 'High Risk', count: summary.at_risk_high, color: colors.status.warning },
                        { id: 'moderate', label: 'Moderate', count: summary.at_risk_moderate, color: colors.status.info },
                        { id: 'lost', label: 'Lost Zones', count: summary.lost_zones, color: colors.text.secondary },
                        { id: 'new', label: 'New Zones', count: summary.new_zones, color: colors.status.success },
                      ]

                  return (
                    <TabNavigation
                      tabs={tabs}
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                    />
                  )
                })()}

                {/* Tab Panel Content - Always Table View */}
                <div className="mt-4">
                  {/* Product Summary Tab - Only shown when multiple products selected */}
                  {activeTab === 'product-summary' && data && (() => {
                    // Group data by product
                    const productGroups = data.reduce((acc: any, zone: any) => {
                      const product = zone.product || 'Unknown'
                      if (!acc[product]) {
                        acc[product] = []
                      }
                      acc[product].push(zone)
                      return acc
                    }, {})

                    // Calculate metrics for each product
                    const productSummary = Object.keys(productGroups).map(product => {
                      const zones = productGroups[product]
                      const totalRev = zones.reduce((sum: number, z: any) => sum + (z.rev_p2 || 0), 0)
                      const totalRevP1 = zones.reduce((sum: number, z: any) => sum + (z.rev_p1 || 0), 0)
                      const revChange = totalRevP1 > 0 ? ((totalRev - totalRevP1) / totalRevP1) * 100 : 0
                      const criticalZones = zones.filter((z: any) => z.risk_level === 'critical').length
                      const highRiskZones = zones.filter((z: any) => z.risk_level === 'high').length
                      const atRiskZones = criticalZones + highRiskZones

                      return {
                        product,
                        revenue: totalRev,
                        revChange,
                        atRiskZones,
                        criticalZones,
                        totalZones: zones.length,
                        status: revChange > 10 ? 'growing' : revChange < -10 ? 'declining' : 'stable'
                      }
                    })

                    // Sort by revenue change (best performers first)
                    productSummary.sort((a, b) => b.revChange - a.revChange)

                    return (
                      <div>
                        <h3 className="text-sm font-medium mb-3" style={{ color: colors.text.primary }}>
                          Product Performance Comparison
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr style={{ borderBottom: `2px solid ${colors.border.default}` }}>
                                <th className="text-left py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>Product</th>
                                <th className="text-right py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>Revenue</th>
                                <th className="text-right py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>Change</th>
                                <th className="text-right py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>At Risk</th>
                                <th className="text-right py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>Zones</th>
                                <th className="text-center py-2 px-3 font-medium" style={{ color: colors.text.secondary }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productSummary.map((p, idx) => (
                                <tr
                                  key={p.product}
                                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                                  style={{ borderBottom: `1px solid ${colors.border.default}` }}
                                  onClick={() => {
                                    setCurrentFilters({ ...currentFilters, product: [p.product] })
                                    handleTabChange('critical')
                                    fetchData()
                                  }}
                                >
                                  <td className="py-3 px-3 font-medium" style={{ color: colors.text.primary }}>
                                    {p.product}
                                  </td>
                                  <td className="py-3 px-3 text-right" style={{ color: colors.text.primary }}>
                                    ${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="py-3 px-3 text-right font-medium" style={{
                                    color: p.revChange > 0 ? colors.status.success : p.revChange < 0 ? colors.status.danger : colors.text.secondary
                                  }}>
                                    {p.revChange > 0 ? '+' : ''}{safeToFixed(p.revChange, 1)}%
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    {p.atRiskZones > 0 ? (
                                      <span className="text-sm px-2 py-1 rounded" style={{
                                        backgroundColor: p.criticalZones > 0 ? colors.status.dangerBg : colors.status.warningBg,
                                        color: p.criticalZones > 0 ? colors.status.danger : colors.status.warning
                                      }}>
                                        {p.atRiskZones}
                                      </span>
                                    ) : (
                                      <span style={{ color: colors.text.tertiary }}>-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right" style={{ color: colors.text.secondary }}>
                                    {p.totalZones}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {p.status === 'growing' && <span className="text-lg">🚀</span>}
                                    {p.status === 'stable' && <span className="text-lg">✓</span>}
                                    {p.status === 'declining' && <span className="text-lg">⚠️</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs mt-3" style={{ color: colors.text.tertiary }}>
                          💡 Click any product row to filter and view detailed zone breakdown
                        </p>
                      </div>
                    )
                  })()}

                  {activeTab === 'critical' && (
                    <DataTable
                      title=""
                      columns={getTableColumns()}
                      data={prepareTableData(segmentedData.critical)}
                      crossFilterColumns={['zid', 'zonename']}
                    />
                  )}

                  {activeTab === 'high' && (
                    <DataTable
                      title=""
                      columns={getTableColumns()}
                      data={prepareTableData(segmentedData.high)}
                      crossFilterColumns={['zid', 'zonename']}
                    />
                  )}

                  {activeTab === 'moderate' && (
                    <DataTable
                      title=""
                      columns={getTableColumns()}
                      data={prepareTableData(segmentedData.moderate)}
                      crossFilterColumns={['zid', 'zonename']}
                    />
                  )}

                  {activeTab === 'lost' && (
                    <DataTable
                      title=""
                      columns={getTableColumns()}
                      data={prepareTableData(segmentedData.lost)}
                      crossFilterColumns={['zid', 'zonename']}
                    />
                  )}

                  {activeTab === 'new' && (
                    <DataTable
                      title=""
                      columns={getTableColumns()}
                      data={prepareTableData(segmentedData.newZones)}
                      crossFilterColumns={['zid', 'zonename']}
                    />
                  )}
                </div>
              </>
            )}
              </>
            )}
          </>
        )}
      </div>
    </AnalyticsPageLayout>
  )
}

export default function DeepDivePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeepDivePageContent />
    </Suspense>
  )
}
