'use client'

import { useState } from 'react'
import { QueryConfig } from '../../../lib/questions/templates'
import { generatePreviewText } from '../../../lib/questions/promptGenerator'
import { DateRangePicker } from './DateRangePicker'
import { EntitySelector } from './EntitySelector'
import { PromptPreview } from './PromptPreview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface UnifiedQueryFormProps {
  onSubmit: (config: QueryConfig) => void
  isLoading?: boolean
}

// Mock template for preview generation
const mockTemplate = {
  id: 'unified',
  action: 'check' as const,
  title: 'Data Analysis',
  description: 'Analyze your data with intelligent queries',
  getFormFields: () => [],
  validateConfig: () => null,
}

export function UnifiedQueryForm({
  onSubmit,
  isLoading = false,
}: UnifiedQueryFormProps) {
  const [actionType, setActionType] = useState<string>('check')
  const [metric, setMetric] = useState<string>('')
  const [entityType, setEntityType] = useState<string>('publisher')
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [timeframe, setTimeframe] = useState<string>('yesterday')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('previous_period')
  const [explainEnabled, setExplainEnabled] = useState(false)
  const [explainBy, setExplainBy] = useState<string[]>([])
  const [adFormatFilter, setAdFormatFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [marketFilter, setMarketFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // For compare action
  const [entity2, setEntity2] = useState<string>('')
  const [metricsToCompare, setMetricsToCompare] = useState<string[]>([])

  // For rank action
  const [rankingType, setRankingType] = useState<string>('top')
  const [rankLimit, setRankLimit] = useState<string>('10')
  const [rankMetric, setRankMetric] = useState<string>('')

  // For suggest action
  const [suggestType, setSuggestType] = useState<string>('upsell')

  // For personal action
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [breakdownBy, setBreakdownBy] = useState<string[]>([])

  // Build form data based on action type
  const buildFormData = (): QueryConfig => {
    const baseConfig: QueryConfig = {
      action: actionType as any,
      timeframe: timeframe as any,
      selectedEntities,
      startDate,
      endDate,
    }

    switch (actionType) {
      case 'check':
        return {
          ...baseConfig,
          metric: metric as any,
          entity: entityType as any,
          comparison: comparisonPeriod as any,
          explainEnabled,
          explainBy: explainBy as any,
          filters: {
            adFormat: adFormatFilter.length > 0 ? adFormatFilter : undefined,
            team: teamFilter.length > 0 ? teamFilter : undefined,
            market: marketFilter ? [marketFilter] : undefined,
          },
        }
      case 'compare':
        return {
          ...baseConfig,
          entity1: entityType,
          entity2,
          metrics: metricsToCompare as any,
        }
      case 'rank':
        return {
          ...baseConfig,
          ranking: rankingType as any,
          rankBy: rankMetric as any,
          limit: parseInt(rankLimit) || 10,
        }
      case 'suggest':
        return {
          ...baseConfig,
          suggestType: suggestType as any,
          metric: metric as any,
        }
      case 'personal':
        return {
          ...baseConfig,
          userRole,
          userName,
          breakdownBy: breakdownBy as any,
          metric: metric as any,
        }
      default:
        return baseConfig
    }
  }

  const formData = buildFormData()
  const previewText = generatePreviewText(mockTemplate, formData)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!metric && ['check', 'suggest', 'personal'].includes(actionType)) {
      newErrors.metric = 'Metric is required'
    }

    if (!entityType && ['check', 'rank'].includes(actionType)) {
      newErrors.entityType = 'Entity type is required'
    }

    if (timeframe === 'custom') {
      if (!startDate) newErrors.startDate = 'Start date is required'
      if (!endDate) newErrors.endDate = 'End date is required'
    }

    if (actionType === 'compare' && !entity2) {
      newErrors.entity2 = 'Second entity is required for comparison'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const metrics = [
    { label: 'Revenue', value: 'revenue' },
    { label: 'Profit', value: 'profit' },
    { label: 'Count', value: 'count' },
    { label: 'Ad Request', value: 'ad_request' },
    { label: 'eCPM', value: 'ecpm' },
    { label: 'Fill Rate', value: 'fill_rate' },
  ]

  const entityTypes = [
    { label: 'Publisher', value: 'publisher' },
    { label: 'Zone', value: 'zone' },
    { label: 'Format', value: 'format' },
    { label: 'Team', value: 'team' },
  ]

  const timeframes = [
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last 7 Days', value: 'last_7days' },
    { label: 'Last 30 Days', value: 'last_30days' },
    { label: 'Custom', value: 'custom' },
  ]

  const comparisonPeriods = [
    { label: 'Previous Period', value: 'previous_period' },
    { label: 'Previous Timeframe', value: 'previous_timeframe' },
    { label: 'Average 30 Days', value: 'average_30d' },
    { label: 'Average 90 Days', value: 'average_90d' },
    { label: 'Year-over-Year', value: 'yoy' },
  ]

  const explainFactors = [
    { label: 'Ad Request', value: 'req' },
    { label: 'Fill Rate', value: 'fill_rate' },
    { label: 'eCPM', value: 'ecpm' },
    { label: 'Zone', value: 'zone' },
    { label: 'Publisher', value: 'pid' },
    { label: 'Format', value: 'format' },
    { label: 'Ad Source', value: 'adsource' },
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Analysis</CardTitle>
        <CardDescription>Build your query by selecting analysis type and parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview Section */}
          <PromptPreview template={mockTemplate} formData={formData} />

          {/* Row 1: Action Type, Metric, Entity Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check & Explain</SelectItem>
                  <SelectItem value="compare">Compare</SelectItem>
                  <SelectItem value="rank">Rank</SelectItem>
                  <SelectItem value="suggest">Suggest</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['check', 'suggest', 'personal', 'rank'].includes(actionType) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric</label>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className={errors.metric ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.metric && <p className="text-xs text-red-500">{errors.metric}</p>}
              </div>
            )}

            {['check', 'compare', 'rank'].includes(actionType) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">For</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className={errors.entityType ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.entityType && <p className="text-xs text-red-500">{errors.entityType}</p>}
              </div>
            )}
          </div>

          {/* Row 2: Entity Selection & Timeframe */}
          {['check', 'compare', 'rank'].includes(actionType) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntitySelector
                entityType={entityType as any}
                selectedEntities={selectedEntities}
                onSelectionChange={setSelectedEntities}
                label={`Select ${entityType}`}
                placeholder={`Search ${entityType}s...`}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">During</label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          {timeframe === 'custom' && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              label="Select Custom Date Range"
            />
          )}

          {/* Row 3: Comparison Period & Rank Settings */}
          {actionType === 'check' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Compare With</label>
                <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {comparisonPeriods.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {actionType === 'rank' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ranking</label>
                <Select value={rankingType} onValueChange={setRankingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Limit</label>
                <Select value={rankLimit} onValueChange={setRankLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rank By</label>
                <Select value={rankMetric} onValueChange={setRankMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {actionType === 'compare' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Compare With</label>
              <Input
                value={entity2}
                onChange={(e) => setEntity2(e.target.value)}
                placeholder="Enter second entity..."
                className={errors.entity2 ? 'border-red-500' : ''}
              />
              {errors.entity2 && <p className="text-xs text-red-500">{errors.entity2}</p>}
            </div>
          )}

          {actionType === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g., PIC, Manager"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>
            </div>
          )}

          {/* Filters Section (Collapsible) */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center gap-2"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ad Format Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ad Format</label>
                  <div className="space-y-2 border rounded p-3">
                    {[
                      { label: 'Flexible Sticky', value: 'flexible_sticky' },
                      { label: 'WipeAd', value: 'wipead' },
                      { label: 'Video', value: 'video' },
                      { label: 'Overlay', value: 'overlay' },
                    ].map((format) => (
                      <div key={format.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`format-${format.value}`}
                          checked={adFormatFilter.includes(format.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAdFormatFilter([...adFormatFilter, format.value])
                            } else {
                              setAdFormatFilter(
                                adFormatFilter.filter((v) => v !== format.value)
                              )
                            }
                          }}
                        />
                        <label htmlFor={`format-${format.value}`} className="text-sm cursor-pointer">
                          {format.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <div className="space-y-2 border rounded p-3">
                    {[
                      { label: 'APP_GV', value: 'APP_GV' },
                      { label: 'WEB_GV', value: 'WEB_GV' },
                      { label: 'WEB_GTI', value: 'WEB_GTI' },
                    ].map((team) => (
                      <div key={team.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`team-${team.value}`}
                          checked={teamFilter.includes(team.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTeamFilter([...teamFilter, team.value])
                            } else {
                              setTeamFilter(
                                teamFilter.filter((v) => v !== team.value)
                              )
                            }
                          }}
                        />
                        <label htmlFor={`team-${team.value}`} className="text-sm cursor-pointer">
                          {team.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Market</label>
                  <Select value={marketFilter} onValueChange={setMarketFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select market" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Markets</SelectItem>
                      <SelectItem value="TH">Thailand</SelectItem>
                      <SelectItem value="VN">Vietnam</SelectItem>
                      <SelectItem value="ID">Indonesia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Explain Options (for Check action) */}
          {actionType === 'check' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="explainEnabled"
                  checked={explainEnabled}
                  onCheckedChange={(checked) => setExplainEnabled(checked as boolean)}
                />
                <label htmlFor="explainEnabled" className="text-sm font-medium cursor-pointer">
                  Explain reasons for changes
                </label>
              </div>

              {explainEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explain by (max 3)</label>
                  <div className="space-y-2 border rounded p-3">
                    {explainFactors.map((factor) => (
                      <div key={factor.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`explain-${factor.value}`}
                          checked={explainBy.includes(factor.value)}
                          disabled={explainBy.length >= 3 && !explainBy.includes(factor.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setExplainBy([...explainBy, factor.value])
                            } else {
                              setExplainBy(
                                explainBy.filter((v) => v !== factor.value)
                              )
                            }
                          }}
                        />
                        <label htmlFor={`explain-${factor.value}`} className="text-sm cursor-pointer">
                          {factor.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? 'Running Analysis...' : 'Run Analysis'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
