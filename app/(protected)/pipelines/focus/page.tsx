'use client'

export const dynamic = 'force-dynamic'

/**
 * Focus of the Month - List Page
 * Displays all focuses with filters and search
 *
 * Access Control:
 * - User: Can only see published focuses
 * - Leader/Manager/Admin: Can see all focuses + create/edit/delete
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateFocusModal } from '@/app/components/pipelines/CreateFocusModal'
import { FocusCardSkeleton } from '@/app/components/pipelines/skeletons'
import { PipelinePageLayout } from '@/app/components/pipelines/PipelinePageLayout'
import { useAuth } from '@/app/contexts/AuthContext'
import type { Focus } from '@/lib/types/focus'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'
import { colors as statusColors } from '@/lib/colors'

const TEAMS = [
  { id: 'WEB_GTI', name: 'Web GTI' },
  { id: 'WEB_GV', name: 'Web GV' },
  { id: 'APP', name: 'App' },
]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function FocusPageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <FocusCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function FocusOfMonthPage() {
  const { user } = useAuth()
  const [focuses, setFocuses] = useState<Focus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Check if user can manage focuses (Leader/Manager/Admin)
  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'leader'

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>(canManage ? 'all' : 'published')

  // Load focuses
  useEffect(() => {
    loadFocuses()
  }, [filterMonth, filterYear, filterTeam, filterGroup, filterStatus])

  async function loadFocuses() {
    setLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams()
      if (filterMonth !== 'all') params.append('month', filterMonth)
      if (filterYear !== 'all') params.append('year', filterYear)
      if (filterTeam !== 'all') params.append('team', filterTeam)
      if (filterGroup !== 'all') params.append('group', filterGroup)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/focus-of-month?${params}`)
      const data = await response.json()

      if (data.status === 'ok') {
        setFocuses(data.data || [])
      } else {
        setError(data.message || 'Failed to load focuses')
      }
    } catch (err) {
      console.error('Error loading focuses:', err)
      setError('Failed to load focuses')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <PipelinePageLayout
      title="Focus of the Month"
      subtitle="Monthly pipeline suggestions and progress tracking"
      headerActions={
        canManage ? (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Focus
          </Button>
        ) : null
      }
    >
      {/* Filters */}
      <div className={`${colors.background.card} rounded-lg border ${spacing.cardPadding}`}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`h-4 w-4 ${colors.text.muted}`} />
          <span className={`text-sm font-medium ${colors.text.secondary}`}>Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${colors.text.muted}`} />
              <Input
                placeholder="Search focuses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadFocuses()
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Month */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" key="filter-month-all">All Months</SelectItem>
              {MONTHS.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" key="filter-year-all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Team */}
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" key="filter-team-all">All Teams</SelectItem>
              {TEAMS.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status - only shown for users who can manage focuses */}
          {canManage ? (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" key="filter-status-all">All Status</SelectItem>
                <SelectItem value="draft" key="filter-status-draft">Draft</SelectItem>
                <SelectItem value="published" key="filter-status-published">Published</SelectItem>
                <SelectItem value="archived" key="filter-status-archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <FocusPageSkeleton />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-2" onClick={loadFocuses}>
            Retry
          </Button>
        </div>
      ) : focuses.length === 0 ? (
        <div className={`text-center py-12 ${colors.background.card} rounded-lg border`}>
          <p className={colors.text.muted}>No focuses found</p>
          <p className={`text-sm ${colors.text.muted} mt-1 opacity-75`}>Create your first focus to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {focuses.map((focus) => (
            <FocusCard key={focus.id} focus={focus} />
          ))}
        </div>
      )}

      {/* Create Focus Modal */}
      <CreateFocusModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadFocuses}
      />
    </PipelinePageLayout>
  )
}

function FocusCard({ focus }: { focus: Focus }) {
  const router = useRouter()
  const monthName = MONTHS[focus.focus_month - 1]
  const teamName = TEAMS.find((t) => t.id === focus.team_id)?.name || 'All Teams'

  const badgeColors = {
    draft: 'bg-slate-100 text-slate-700',
    published: 'bg-blue-600 text-white',
    archived: 'bg-slate-100 text-slate-700',
  }

  return (
    <div
      className={`${colors.background.card} rounded-lg border ${spacing.cardPadding} hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => router.push(`/pipelines/focus/${focus.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold ${colors.text.primary} line-clamp-1`}>{focus.title}</h3>
          <p className={`text-xs ${colors.text.muted} mt-1`}>
            {monthName} {focus.focus_year} • {teamName}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            badgeColors[focus.status]
          }`}
        >
          {focus.status}
        </span>
      </div>

      {/* Description */}
      {focus.description && (
        <p className={`text-sm ${colors.text.secondary} line-clamp-2 mb-3`}>{focus.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
        <div>
          <p className={`text-lg font-semibold ${colors.text.primary}`}>
            {focus.suggestion_count || 0}
          </p>
          <p className={`text-xs ${colors.text.muted}`}>Total</p>
        </div>
        <div>
          <p className="text-lg font-semibold" style={{ color: statusColors.status.success }}>
            {focus.created_count || 0}
          </p>
          <p className={`text-xs ${colors.text.muted}`}>Created</p>
        </div>
        <div>
          <p className={`text-lg font-semibold ${colors.text.secondary}`}>
            {focus.pending_count || 0}
          </p>
          <p className={`text-xs ${colors.text.muted}`}>Pending</p>
        </div>
      </div>
    </div>
  )
}
