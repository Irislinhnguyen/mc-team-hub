'use client'

import { useState, useEffect } from 'react'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { BarChartComponent } from '../../../components/performance-tracker/BarChart'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { DateRangePicker } from '../../../components/forms/DateRangePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BusinessHealthPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Error fetching business health data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Loading business health data...</p>
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  const metrics = data.metrics || {}
  const timeSeries = (data.timeSeries || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(),
    revenue: parseFloat(d.revenue) || 0,
    profit: parseFloat(d.profit) || 0,
  }))

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={Math.round(metrics.total_revenue || 0)} unit="$" />
        <MetricCard label="Total Profit" value={Math.round(metrics.total_profit || 0)} unit="$" />
        <MetricCard label="Total Requests" value={metrics.total_requests || 0} />
        <MetricCard label="Total Paid" value={metrics.total_paid || 0} />
      </div>

      {/* Time Series Chart */}
      {timeSeries.length > 0 && (
        <TimeSeriesChart
          title="Revenue & Profit Over Time"
          data={timeSeries}
          lines={[
            { dataKey: 'revenue', name: 'Revenue', color: '#3b82f6' },
            { dataKey: 'profit', name: 'Profit', color: '#10b981' },
          ]}
        />
      )}

      {/* Top 10 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.topPublishers && data.topPublishers.length > 0 && (
          <BarChartComponent
            title="Top 10 Publishers by Revenue"
            data={data.topPublishers}
            barDataKey="revenue"
            barName="Revenue"
            barColor="#3b82f6"
            xAxisDataKey="pubname"
          />
        )}

        {data.topMedia && data.topMedia.length > 0 && (
          <BarChartComponent
            title="Top 10 Media by Revenue"
            data={data.topMedia}
            barDataKey="revenue"
            barName="Revenue"
            barColor="#8b5cf6"
            xAxisDataKey="medianame"
          />
        )}

        {data.topZones && data.topZones.length > 0 && (
          <BarChartComponent
            title="Top 10 Zones by Revenue"
            data={data.topZones}
            barDataKey="revenue"
            barName="Revenue"
            barColor="#ec4899"
            xAxisDataKey="zonename"
          />
        )}

        {data.topEcpm && data.topEcpm.length > 0 && (
          <BarChartComponent
            title="Top 10 Zones by eCPM"
            data={data.topEcpm}
            barDataKey="ecpm"
            barName="eCPM"
            barColor="#f59e0b"
            xAxisDataKey="zonename"
          />
        )}
      </div>

      {/* Additional sections would go here */}
    </div>
  )
}
