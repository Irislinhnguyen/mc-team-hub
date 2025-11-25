'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { RefreshCw, Download, TrendingUp, DollarSign, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UsageSummary {
  today: SummaryData
  thisMonth: SummaryData
  allTime: SummaryData
}

interface SummaryData {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  totalTokens: number
  totalCost: number
  avgCostPerRequest: number
}

interface TrendData {
  date: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  totalTokens: number
  totalCost: number
}

interface TopUser {
  rank: number
  userId: string
  email: string
  role: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  totalTokens: number
  totalCost: number
  avgCostPerCall: number
}

interface BreakdownItem {
  name: string
  calls: number
  tokens: number
  cost: number
  percentage: number
}

interface LogEntry {
  id: string
  timestamp: string
  user: { id: string; email: string; role: string }
  endpoint: string
  feature: string
  model: string
  tokens: { prompt: number; completion: number; total: number }
  cost: { input: number; output: number; total: number }
  requestSummary: string
  status: string
  errorMessage: string | null
  executionTimeMs: number
}

export default function AIUsageDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [breakdown, setBreakdown] = useState<{
    byModel: BreakdownItem[]
    byFeature: BreakdownItem[]
    byRole: BreakdownItem[]
  }>({ byModel: [], byFeature: [], byRole: [] })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [dateRange, setDateRange] = useState(30) // days
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, trendsRes, topUsersRes, breakdownRes, logsRes] = await Promise.all([
        fetch('/api/admin/ai-usage/summary'),
        fetch(`/api/admin/ai-usage/trends?days=${dateRange}`),
        fetch(`/api/admin/ai-usage/top-users?days=${dateRange}&limit=10`),
        fetch(`/api/admin/ai-usage/breakdown?days=${dateRange}`),
        fetch(`/api/admin/ai-usage/logs?days=${dateRange}&limit=20`),
      ])

      if (!summaryRes.ok || !trendsRes.ok || !topUsersRes.ok || !breakdownRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [summaryData, trendsData, topUsersData, breakdownData, logsData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        topUsersRes.json(),
        breakdownRes.json(),
        logsRes.json(),
      ])

      setSummary(summaryData)
      setTrends(trendsData.trends || [])
      setTopUsers(topUsersData.users || [])
      setBreakdown(breakdownData)
      setLogs(logsData.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error fetching AI usage data:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const formatFeatureName = (feature: string) => {
    return feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/admin/ai-usage/export?format=${format}&days=${dateRange}`)
      if (!response.ok) throw new Error('Export failed')

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `openai-usage-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `openai-usage-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-[#1565C0] text-white">admin</Badge>
      case 'manager':
        return <Badge className="bg-purple-500 text-white">manager</Badge>
      case 'leader':
        return <Badge className="bg-amber-500 text-white">leader</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">user</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-[#1565C0]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <Button
            onClick={fetchData}
            variant="destructive"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OpenAI Usage Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor AI API usage, costs, and performance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-[#1565C0]"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          {/* Export Button */}
          <div className="relative group">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 text-sm"
              >
                Export JSON
              </button>
            </div>
          </div>
          {/* Refresh Button */}
          <Button onClick={fetchData} className="gap-2 bg-[#1565C0] hover:bg-[#0D47A1]">
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Today</CardTitle>
              <Badge className="bg-green-100 text-green-700">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.today.totalCost || 0)}</p>
              <p className="text-gray-500 text-sm">{formatNumber(summary?.today.totalCalls || 0)} calls</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">{formatNumber(summary?.today.totalTokens || 0)} tokens</span>
                <span className="text-green-600">{summary?.today.successfulCalls || 0} success</span>
                {(summary?.today.failedCalls || 0) > 0 && (
                  <span className="text-red-600">{summary?.today.failedCalls} failed</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.thisMonth.totalCost || 0)}</p>
              <p className="text-gray-500 text-sm">{formatNumber(summary?.thisMonth.totalCalls || 0)} calls</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">{formatNumber(summary?.thisMonth.totalTokens || 0)} tokens</span>
                <span className="text-[#1565C0]">
                  Avg: {formatCurrency(summary?.thisMonth.avgCostPerRequest || 0)}/call
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Time */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">All Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.allTime.totalCost || 0)}</p>
              <p className="text-gray-500 text-sm">{formatNumber(summary?.allTime.totalCalls || 0)} total calls</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">{formatNumber(summary?.allTime.totalTokens || 0)} tokens</span>
                <span className="text-purple-600">
                  Success rate: {summary?.allTime.totalCalls ? ((summary.allTime.successfulCalls / summary.allTime.totalCalls) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">Cost Trend (Last {dateRange} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {trends.length === 0 ? (
                <p className="text-gray-500 m-auto">No data available</p>
              ) : (
                trends.slice(-30).map((day, i) => {
                  const maxCost = Math.max(...trends.map(t => t.totalCost), 0.01)
                  const height = (day.totalCost / maxCost) * 100
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-[#1565C0] rounded-t hover:bg-[#0D47A1] transition-colors group relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${formatCurrency(day.totalCost)}`}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                        {day.date}<br />{formatCurrency(day.totalCost)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">Daily Cost</div>
          </CardContent>
        </Card>

        {/* Breakdown by Feature */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">Cost by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.byFeature.length === 0 ? (
                <p className="text-gray-500">No data available</p>
              ) : (
                breakdown.byFeature.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{formatFeatureName(item.name)}</span>
                      <span className="text-gray-500">{formatCurrency(item.cost)} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1565C0] to-purple-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model and Role Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Model */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.byModel.length === 0 ? (
                <p className="text-gray-500">No data available</p>
              ) : (
                breakdown.byModel.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-900 font-medium">{item.name}</p>
                      <p className="text-gray-500 text-sm">{formatNumber(item.calls)} calls</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900">{formatCurrency(item.cost)}</p>
                      <p className="text-gray-500 text-sm">{formatNumber(item.tokens)} tokens</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Role */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">Usage by User Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.byRole.length === 0 ? (
                <p className="text-gray-500">No data available</p>
              ) : (
                breakdown.byRole.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.name === 'admin' ? 'bg-[#1565C0]' :
                        item.name === 'manager' ? 'bg-purple-500' :
                        item.name === 'leader' ? 'bg-amber-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-gray-900 font-medium capitalize">{item.name}</p>
                        <p className="text-gray-500 text-sm">{formatNumber(item.calls)} calls</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900">{formatCurrency(item.cost)}</p>
                      <p className="text-gray-500 text-sm">{item.percentage}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">Top Users by Cost</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Avg/Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">No data available</TableCell>
                </TableRow>
              ) : (
                topUsers.map((u) => (
                  <TableRow key={u.userId} className="hover:bg-gray-50">
                    <TableCell className="text-gray-500">{u.rank}</TableCell>
                    <TableCell className="font-medium text-gray-900">{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-right text-gray-700">{formatNumber(u.totalCalls)}</TableCell>
                    <TableCell className="text-right text-gray-700">{formatNumber(u.totalTokens)}</TableCell>
                    <TableCell className="text-right font-medium text-gray-900">{formatCurrency(u.totalCost)}</TableCell>
                    <TableCell className="text-right text-gray-500">{formatCurrency(u.avgCostPerCall)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity Log - Compact */}
      <Card className="border-gray-200">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-gray-700">Recent API Calls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">User</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Cost</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">No recent activity</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-1.5 px-3 text-gray-500">
                        {new Date(log.timestamp).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-1.5 px-3 text-gray-700 truncate max-w-[150px]">{log.user.email}</td>
                      <td className="py-1.5 px-3 text-right text-gray-900">{formatCurrency(log.cost.total)}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' :
                          log.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`} title={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
