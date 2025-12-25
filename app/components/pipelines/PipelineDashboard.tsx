'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/app/components/performance-tracker/MetricCard'
import { StatusFunnelChart } from './StatusFunnelChart'
import { QuarterlyForecastChart } from './QuarterlyForecastChart'
import { PocPerformanceCard } from './PocPerformanceCard'
import { ActionItemsWidget } from './ActionItemsWidget'
import { TopOpportunitiesTable } from './TopOpportunitiesTable'
import type { DashboardStats } from '@/lib/types/dashboard'

interface Props {
  pipelineId: string
  userPoc?: string
}

export function PipelineDashboard({ pipelineId, userPoc }: Props) {
  const [viewMode, setViewMode] = useState<'manager' | 'team'>('manager')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [pipelineId, viewMode])

  async function fetchDashboardStats() {
    setLoading(true)
    setError(null)
    try {
      const poc = viewMode === 'team' && userPoc ? `?poc=${userPoc}` : ''
      const url = `/api/pipelines/${pipelineId}/dashboard${poc}`

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await res.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load dashboard: {error}</p>
        <Button onClick={fetchDashboardStats}>Retry</Button>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center py-12">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Pipeline Dashboard</h2>
          <p className="text-sm text-gray-500">
            Track team performance and pipeline health
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'manager' ? 'default' : 'outline'}
            onClick={() => setViewMode('manager')}
            size="sm"
          >
            Manager View
          </Button>
          <Button
            variant={viewMode === 'team' ? 'default' : 'outline'}
            onClick={() => setViewMode('team')}
            size="sm"
          >
            My Deals
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pipeline"
          value={stats.overview.total_pipeline_value}
          format="currency"
          subtitle={`${stats.overview.total_deals} deals`}
        />
        <MetricCard
          title="Weighted Value"
          value={stats.overview.weighted_pipeline_value}
          format="currency"
          subtitle="Probability-adjusted"
        />
        <MetricCard
          title="Win Rate"
          value={stats.overview.win_rate}
          format="percent"
          subtitle="Closed won %"
        />
        <MetricCard
          title="Avg Deal Size"
          value={stats.overview.avg_deal_size}
          format="currency"
          subtitle="Per opportunity"
        />
      </div>

      {/* Status Funnel */}
      <StatusFunnelChart data={stats.by_status} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuarterlyForecastChart data={stats.monthly_forecast} />
        <div className="grid grid-cols-2 gap-4">
          {stats.by_poc.slice(0, 4).map(poc => (
            <PocPerformanceCard key={poc.poc} data={poc} />
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopOpportunitiesTable deals={stats.top_opportunities} />
        <ActionItemsWidget items={stats.action_items} />
      </div>
    </div>
  )
}
