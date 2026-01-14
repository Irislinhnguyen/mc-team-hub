'use client'

/**
 * Team Setup Page - Pipelines
 * Manage team assignments with full audit trail
 */

import React, { useState, useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import TeamSetupCardSkeleton from '../../../components/performance-tracker/skeletons/TeamSetupCardSkeleton'
import { DynamicTableSkeleton } from '../../../components/performance-tracker/skeletons/DynamicTableSkeleton'
import type { ColumnConfig } from '@/lib/types/performanceTracker'

interface PicAssignment {
  pic_name: string
  team_id: string | null
  team_name: string | null
  updated_at: string | null
  updated_by_email: string | null
  pipeline_poc_name: string | null
}

const TEAMS = [
  { id: 'WEB_GTI', name: 'Indonesia Web Team' },
  { id: 'WEB_GV', name: 'Vietnam Web Team' },
  { id: 'APP', name: 'App Team' },
]

// Table column definitions
const tableColumns: ColumnConfig[] = [
  { key: 'pic_name', label: 'PIC Name' },
  { key: 'team', label: 'Team' },
  { key: 'pipeline_poc', label: 'Pipeline POC' },
  { key: 'updated_at', label: 'Last Updated' },
  { key: 'updated_by', label: 'Updated By' },
]

export default function TeamSetupPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [assignments, setAssignments] = useState<PicAssignment[]>([])
  const [allPics, setAllPics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    picName: string
    currentTeam: string | null
    newTeam: string
  } | null>(null)
  const [availablePocs, setAvailablePocs] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Fetch assignments
      const assignmentsRes = await fetch('/api/teams/assignments')
      const assignmentsData = await assignmentsRes.json()

      if (assignmentsData.status === 'error') {
        throw new Error(assignmentsData.message)
      }

      // Fetch all PICs from BigQuery
      const allPicsRes = await fetch('/api/teams/all-pics')
      const allPicsData = await allPicsRes.json()

      if (allPicsData.status === 'error') {
        throw new Error(allPicsData.message)
      }

      // Fetch all Pipeline POCs from pipeline_deals
      const pocsRes = await fetch('/api/pipelines/pocs')
      const pocsData = await pocsRes.json()

      if (pocsData.error) {
        throw new Error(pocsData.error)
      }

      setAssignments(assignmentsData.data)
      setAllPics(allPicsData.data)
      setAvailablePocs(pocsData.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleTeamChangeRequest(picName: string, currentTeamId: string | null, newTeamId: string) {
    // Don't show modal if no actual change
    if (currentTeamId === newTeamId || (currentTeamId === null && newTeamId === 'unassigned')) {
      return
    }

    // Show confirmation modal
    setConfirmModal({
      picName,
      currentTeam: currentTeamId,
      newTeam: newTeamId
    })
  }

  async function handlePOCChange(picName: string, newPOC: string) {
    try {
      const res = await fetch('/api/teams/update-pipeline-poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          picName,
          pipelinePocName: newPOC
        })
      })

      const data = await res.json()
      if (data.status === 'error') throw new Error(data.message)

      // Update local state
      setAssignments(prev =>
        prev.map(a =>
          a.pic_name === picName
            ? { ...a, pipeline_poc_name: newPOC || null }
            : a
        )
      )
    } catch (err) {
      console.error('Error updating Pipeline POC:', err)
      alert(err instanceof Error ? err.message : 'Failed to update Pipeline POC')
      await loadData() // Reload on error
    }
  }

  async function confirmTeamChange() {
    if (!confirmModal) return

    const { picName, newTeam } = confirmModal
    setConfirmModal(null)
    setUpdating(picName)

    try {
      // Get user email (mock for now - you can get from auth session)
      const userEmail = 'current.user@geniee.co.jp' // TODO: Get from actual auth

      if (newTeam === 'unassigned') {
        // Unassign
        const res = await fetch('/api/teams/unassign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ picName })
        })

        const data = await res.json()
        if (data.status === 'error') throw new Error(data.message)

        // Update local state
        setAssignments(prev =>
          prev.filter(a => a.pic_name !== picName)
        )
      } else {
        // Assign to team
        const res = await fetch('/api/teams/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ picName, teamId: newTeam, userEmail })
        })

        const data = await res.json()
        if (data.status === 'error') throw new Error(data.message)

        // Update local state
        const team = TEAMS.find(t => t.id === newTeam)
        const now = new Date().toISOString()

        setAssignments(prev => {
          const existing = prev.find(a => a.pic_name === picName)
          if (existing) {
            return prev.map(a =>
              a.pic_name === picName
                ? {
                    ...a,
                    team_id: newTeam,
                    team_name: team?.name || newTeam,
                    updated_at: now,
                    updated_by_email: userEmail
                  }
                : a
            )
          } else {
            return [
              ...prev,
              {
                pic_name: picName,
                team_id: newTeam,
                team_name: team?.name || newTeam,
                updated_at: now,
                updated_by_email: userEmail
              }
            ]
          }
        })
      }
    } catch (err) {
      console.error('Error updating assignment:', err)
      alert(err instanceof Error ? err.message : 'Failed to update assignment')
      await loadData() // Reload on error
    } finally {
      setUpdating(null)
    }
  }

  // Combine assigned and unassigned PICs
  const allPicsWithAssignments = allPics.map(pic => {
    const assignment = assignments.find(a => a.pic_name === pic)
    return {
      pic_name: pic,
      team_id: assignment?.team_id || null,
      team_name: assignment?.team_name || 'Unassigned',
      updated_at: assignment?.updated_at || null,
      updated_by_email: assignment?.updated_by_email || null,
      pipeline_poc_name: assignment?.pipeline_poc_name || null
    }
  })

  // Filter
  const filteredPics = allPicsWithAssignments.filter(p => {
    const matchesSearch = p.pic_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTeam = filterTeam === 'all' ||
                       (filterTeam === 'unassigned' && !p.team_id) ||
                       p.team_id === filterTeam
    return matchesSearch && matchesTeam
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Setup</h1>
          <p className="text-sm text-gray-500">Manage PIC team assignments and Pipeline POC mappings</p>
        </div>

        <div>
          {/* Team Summary Cards Skeleton */}
          <div className="mb-4 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <TeamSetupCardSkeleton key={i} />
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="mb-3 flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-48" />
          </div>

          {/* Table Skeleton */}
          <DynamicTableSkeleton columns={tableColumns} rows={7} showPagination={false} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Setup</h1>
          <p className="text-sm text-gray-500">Manage PIC team assignments and Pipeline POC mappings</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Team summaries
  const teamSummaries = TEAMS.map(team => {
    const members = allPicsWithAssignments.filter(p => p.team_id === team.id)
    return { team, members }
  })

  // Unassigned PICs
  const unassignedMembers = allPicsWithAssignments.filter(p => !p.team_id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Setup</h1>
        <p className="text-sm text-gray-500">Manage PIC team assignments and Pipeline POC mappings</p>
      </div>

      <div>
        {/* Team Summary Cards - Single Row */}
        <div className="mb-4 flex gap-3">
        {teamSummaries.map(({ team, members }) => (
          <div key={team.id} className="flex-1 bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-900">{team.name}</h3>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {members.length}
              </span>
            </div>
            <div className="max-h-24 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-xs text-gray-400 italic">No members</div>
              ) : (
                <ul className="space-y-0.5">
                  {members.map(member => (
                    <li key={member.pic_name} className="text-xs text-gray-700">
                      • {member.pic_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {/* Unassigned Card */}
        <div className="flex-1 bg-white rounded-lg border border-gray-300 border-dashed p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500">Unassigned</h3>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
              {unassignedMembers.length}
            </span>
          </div>
          <div className="max-h-24 overflow-y-auto">
            {unassignedMembers.length === 0 ? (
              <div className="text-xs text-gray-400 italic">All assigned</div>
            ) : (
              <ul className="space-y-0.5">
                {unassignedMembers.map(member => (
                  <li key={member.pic_name} className="text-xs text-gray-500">
                    • {member.pic_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Filters - Smaller */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          placeholder="Search PICs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Teams</option>
          <option value="unassigned">Unassigned</option>
          {TEAMS.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      {/* Table - Compact with 7 rows max height and sticky header */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="max-h-[308px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PIC Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pipeline POC
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPics.map((pic) => (
              <tr key={pic.pic_name} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                  {pic.pic_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                  <select
                    value={pic.team_id || 'unassigned'}
                    onChange={(e) => handleTeamChangeRequest(pic.pic_name, pic.team_id, e.target.value)}
                    disabled={updating === pic.pic_name}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="unassigned">Unassigned</option>
                    {TEAMS.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                  <select
                    value={pic.pipeline_poc_name || ''}
                    onChange={(e) => handlePOCChange(pic.pic_name, e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {availablePocs.map(poc => (
                      <option key={poc} value={poc}>{poc}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                  {pic.updated_at
                    ? new Date(pic.updated_at).toLocaleString()
                    : '-'
                  }
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                  {pic.updated_by_email || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {filteredPics.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No PICs found
          </div>
        )}
      </div>

        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredPics.length} of {allPics.length} PICs
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Confirm Team Change
            </h3>
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to change <strong>{confirmModal.picName}</strong>'s team assignment?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                <p className="text-xs text-yellow-800">
                  <strong>Warning:</strong> This will affect all analytics when filtering by team.
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">From:</span>
                  <span className="font-medium text-gray-900">
                    {confirmModal.currentTeam
                      ? TEAMS.find(t => t.id === confirmModal.currentTeam)?.name
                      : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">To:</span>
                  <span className="font-medium text-blue-600">
                    {confirmModal.newTeam === 'unassigned'
                      ? 'Unassigned'
                      : TEAMS.find(t => t.id === confirmModal.newTeam)?.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmTeamChange}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
