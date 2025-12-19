/**
 * Chart Data Transformers
 * Utilities for transforming data for breakdown/drill-down charts
 */

import type { TeamConfiguration, TeamPicMapping } from '../supabase/database.types'

interface TimeSeriesDataPoint {
  date: string
  rawDate: string
  [key: string]: any
}

interface BreakdownDataPoint {
  date: string
  rawDate: string
  entityId: string
  entityName: string
  revenue: number
  profit: number
}

/**
 * Aggregate PID data by TEAM
 * Maps: PID → PIC → TEAM, then groups by TEAM and date
 */
export function aggregateTEAMTimeSeriesData(
  pidData: any[],
  picMappings: TeamPicMapping[],
  teamConfigs: TeamConfiguration[]
): BreakdownDataPoint[] {
  if (!pidData || pidData.length === 0) return []

  // Create PID → PIC → TEAM mapping
  const pidToTeamMap = new Map<string, { teamId: string; teamName: string }>()

  // For each PID in the data, find its PIC, then find the team
  pidData.forEach(row => {
    const pid = String(row.pid)
    if (pidToTeamMap.has(pid)) return

    // Find PIC mapping (note: the BigQuery 'pic' field might actually be the PIC name, not PID)
    // We need to check the actual data structure
    const picMapping = picMappings.find(m => m.pic_name === row.pic)

    if (picMapping) {
      const team = teamConfigs.find(t => t.team_id === picMapping.team_id)
      if (team) {
        pidToTeamMap.set(pid, {
          teamId: team.team_id,
          teamName: team.team_name || team.team_id
        })
      }
    }
  })

  // Group by TEAM and date, sum revenue/profit
  const teamDateMap = new Map<string, BreakdownDataPoint>()

  pidData.forEach(row => {
    const pid = String(row.pid)

    // Check if PIC is NULL or empty - treat as Unassigned
    const picName = row.pic
    const hasValidPic = picName && String(picName).trim() !== ''

    // Only look up team if we have a valid PIC
    const teamInfo = hasValidPic ? pidToTeamMap.get(pid) : null

    if (!teamInfo) {
      // Unassigned - either no PIC, NULL PIC, or PIC not mapped to team
      const key = `Unassigned|${row.date}`
      const existing = teamDateMap.get(key) || {
        date: row.date,
        rawDate: row.rawDate || row.date,
        entityId: 'unassigned',
        entityName: 'Unassigned',
        revenue: 0,
        profit: 0
      }
      existing.revenue += Number(row.rev || 0)
      existing.profit += Number(row.profit || 0)
      teamDateMap.set(key, existing)
    } else {
      const key = `${teamInfo.teamId}|${row.date}`
      const existing = teamDateMap.get(key) || {
        date: row.date,
        rawDate: row.rawDate || row.date,
        entityId: teamInfo.teamId,
        entityName: teamInfo.teamName,
        revenue: 0,
        profit: 0
      }
      existing.revenue += Number(row.rev || 0)
      existing.profit += Number(row.profit || 0)
      teamDateMap.set(key, existing)
    }
  })

  return Array.from(teamDateMap.values())
}

/**
 * Aggregate PID data by PIC within a specific TEAM
 */
export function aggregatePICTimeSeriesData(
  pidData: any[],
  picMappings: TeamPicMapping[],
  teamId: string | null
): BreakdownDataPoint[] {
  if (!pidData || pidData.length === 0) return []

  // Filter to PIDs that belong to this team
  const teamPics = teamId
    ? new Set(picMappings.filter(m => m.team_id === teamId).map(m => m.pic_name))
    : new Set()

  // Group by PIC and date
  const picDateMap = new Map<string, BreakdownDataPoint>()

  pidData.forEach(row => {
    const picName = row.pic

    // Skip if teamId is specified and this PIC doesn't belong to it
    if (teamId && !teamPics.has(picName)) return

    const key = `${picName}|${row.date}`
    const existing = picDateMap.get(key) || {
      date: row.date,
      rawDate: row.rawDate || row.date,
      entityId: picName,
      entityName: picName,
      revenue: 0,
      profit: 0
    }
    existing.revenue += Number(row.rev || 0)
    existing.profit += Number(row.profit || 0)
    picDateMap.set(key, existing)
  })

  return Array.from(picDateMap.values())
}

/**
 * Filter PID data to a specific PIC
 */
export function filterPIDsByPIC(
  pidData: any[],
  picName: string
): BreakdownDataPoint[] {
  if (!pidData || pidData.length === 0) {
    console.log('[filterPIDsByPIC] No data available')
    return []
  }

  console.log('[filterPIDsByPIC] Input:', {
    totalRows: pidData.length,
    picName,
    sampleRow: pidData[0],
    uniquePICs: [...new Set(pidData.map(r => r.pic))].slice(0, 10)
  })

  const filtered = pidData.filter(row => row.pic === picName)

  console.log('[filterPIDsByPIC] Filtered:', {
    matchedRows: filtered.length,
    uniquePIDs: [...new Set(filtered.map(r => r.pid))].slice(0, 10)
  })

  return filtered.map(row => {
    // BUGFIX: Handle date object format {value: "2025-11-19"}
    const dateValue = row.date?.value || row.date
    const rawDateValue = row.rawDate || dateValue

    return {
      date: dateValue,
      rawDate: rawDateValue,
      entityId: String(row.pid),
      entityName: row.pubname || `PID ${row.pid}`,
      revenue: Number(row.rev || 0),
      profit: Number(row.profit || 0)
    }
  })
}

/**
 * Filter MID data to a specific PID or publisher name
 * Supports both numeric PID (e.g., "37653") and string pubname (e.g., "Tran Xuan Tien")
 */
export function filterMIDsByPID(
  midData: any[],
  pid: string
): BreakdownDataPoint[] {
  if (!midData || midData.length === 0) {
    console.log('[filterMIDsByPID] No data available')
    return []
  }

  console.log('[filterMIDsByPID] Input:', {
    totalRows: midData.length,
    pid,
    sampleRow: midData[0],
    sampleDateField: midData[0]?.date,
    sampleRawDateField: midData[0]?.rawDate
  })

  // BUGFIX: Support both pid (numeric) and pubname (string) filters
  // This allows filtering by either "pid: 37653" or "pubname: Tran Xuan Tien"
  const filtered = midData.filter(row =>
    String(row.pid) === pid || row.pubname === pid
  )

  console.log('[filterMIDsByPID] Filtered:', {
    matchedRows: filtered.length,
    uniqueMIDs: [...new Set(filtered.map(r => r.mid))].slice(0, 10)
  })

  const result = filtered.map(row => {
    // BUGFIX: Handle date object format {value: "2025-11-19"} and normalize to ISO
    let dateValue: string
    let rawDateValue: string

    if (row.date && typeof row.date === 'object' && 'value' in row.date) {
      dateValue = row.date.value
      rawDateValue = row.rawDate || row.date.value
    } else {
      dateValue = String(row.date || '')
      rawDateValue = row.rawDate || dateValue
    }

    // CRITICAL FIX: Normalize to ISO format YYYY-MM-DD (remove time component if exists)
    const isoDate = rawDateValue && rawDateValue.includes('T')
      ? rawDateValue.split('T')[0]
      : rawDateValue

    return {
      date: dateValue,
      rawDate: isoDate,  // ← Guaranteed ISO format YYYY-MM-DD
      entityId: String(row.mid),
      entityName: row.medianame || `MID ${row.mid}`,
      revenue: Number(row.rev || 0),
      profit: Number(row.profit || 0)
    }
  })

  console.log('[filterMIDsByPID] Output sample:', {
    firstResult: result[0],
    rawDateFormat: result[0]?.rawDate
  })

  return result
}

/**
 * Filter ZID data to a specific MID or media name
 * Supports both numeric MID (e.g., "12345") and string medianame (e.g., "Media Name")
 */
export function filterZIDsByMID(
  zoneData: any[],
  mid: string
): BreakdownDataPoint[] {
  if (!zoneData || zoneData.length === 0) {
    console.log('[filterZIDsByMID] No data available')
    return []
  }

  console.log('[filterZIDsByMID] Input:', {
    totalRows: zoneData.length,
    mid,
    sampleRow: zoneData[0]
  })

  // BUGFIX: Support both mid (numeric) and medianame (string) filters
  // This allows filtering by either "mid: 12345" or "medianame: Media Name"
  const filtered = zoneData.filter(row =>
    String(row.mid) === mid || row.medianame === mid
  )

  console.log('[filterZIDsByMID] Filtered:', {
    matchedRows: filtered.length,
    uniqueZIDs: [...new Set(filtered.map(r => r.zid))].slice(0, 10)
  })

  const result = filtered.map(row => {
    // BUGFIX: Handle date object format {value: "2025-11-19"} and normalize to ISO
    let dateValue: string
    let rawDateValue: string

    if (row.date && typeof row.date === 'object' && 'value' in row.date) {
      dateValue = row.date.value
      rawDateValue = row.rawDate || row.date.value
    } else {
      dateValue = String(row.date || '')
      rawDateValue = row.rawDate || dateValue
    }

    // CRITICAL FIX: Normalize to ISO format YYYY-MM-DD (remove time component if exists)
    const isoDate = rawDateValue && rawDateValue.includes('T')
      ? rawDateValue.split('T')[0]
      : rawDateValue

    return {
      date: dateValue,
      rawDate: isoDate,  // ← Guaranteed ISO format YYYY-MM-DD
      entityId: String(row.zid),
      entityName: row.zonename || `ZID ${row.zid}`,
      revenue: Number(row.rev || 0),
      profit: Number(row.profit || 0)
    }
  })

  console.log('[filterZIDsByMID] Output sample:', {
    firstResult: result[0],
    rawDateFormat: result[0]?.rawDate
  })

  return result
}

/**
 * Transform breakdown data into multi-line chart format
 * Input: Array of { date, entityId, entityName, revenue, profit }
 * Output: Array of { date, rawDate, [entityName1]: value, [entityName2]: value, ... }
 */
export function transformForBreakdown(
  data: BreakdownDataPoint[],
  metric: 'revenue' | 'profit',
  allDates?: string[]
): TimeSeriesDataPoint[] {
  if (!data || data.length === 0) return []

  console.log('[transformForBreakdown] Input:', {
    dataRows: data.length,
    metric,
    allDatesProvided: !!allDates,
    allDatesCount: allDates?.length,
    sampleDataDate: data[0]?.date,
    sampleDataRawDate: data[0]?.rawDate,
    sampleAllDate: allDates?.[0]
  })

  // Group by date - ALWAYS use rawDate as key for consistency
  const dateMap = new Map<string, TimeSeriesDataPoint>()

  data.forEach(row => {
    const key = row.rawDate || row.date  // Use rawDate as key
    const existing = dateMap.get(key) || {
      date: row.date,
      rawDate: row.rawDate || row.date
    }
    existing[row.entityName] = row[metric]
    dateMap.set(key, existing)
  })

  console.log('[transformForBreakdown] After grouping:', {
    uniqueDates: dateMap.size,
    dateKeys: Array.from(dateMap.keys()).slice(0, 5)
  })

  // If allDates provided, ensure all dates are present (fill missing with 0)
  if (allDates && allDates.length > 0) {
    // Get all unique entity names from data
    const entityNames = new Set<string>()
    data.forEach(row => entityNames.add(row.entityName))

    console.log('[transformForBreakdown] Filling missing dates:', {
      allDatesCount: allDates.length,
      entityNames: Array.from(entityNames),
      dateMapBefore: dateMap.size
    })

    let filledCount = 0

    // Ensure all dates exist in the map
    allDates.forEach(date => {
      if (!dateMap.has(date)) {
        const dataPoint: TimeSeriesDataPoint = {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: date
        }
        // Add 0 for all entities on missing dates
        entityNames.forEach(entityName => {
          dataPoint[entityName] = 0
        })
        dateMap.set(date, dataPoint)
        filledCount++
      } else {
        // Fill missing entities with 0 for existing dates
        const existing = dateMap.get(date)!
        entityNames.forEach(entityName => {
          if (existing[entityName] === undefined) {
            existing[entityName] = 0
          }
        })
      }
    })

    console.log('[transformForBreakdown] After filling:', {
      dateMapAfter: dateMap.size,
      filledCount
    })
  }

  // Sort by rawDate using proper date comparison (not string comparison)
  return Array.from(dateMap.values()).sort((a, b) => {
    const dateA = new Date(a.rawDate || a.date)
    const dateB = new Date(b.rawDate || b.date)
    return dateA.getTime() - dateB.getTime()
  })
}

/**
 * Get top N entities by total metric value
 * Returns array of entity names sorted by total value
 */
export function getTopNEntities(
  data: BreakdownDataPoint[],
  metric: 'revenue' | 'profit',
  n: number
): string[] {
  if (!data || data.length === 0) return []

  // Sum by entity
  const entityTotals = new Map<string, number>()

  data.forEach(row => {
    const current = entityTotals.get(row.entityName) || 0
    entityTotals.set(row.entityName, current + row[metric])
  })

  // Sort by total and take top N
  return Array.from(entityTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([entityName]) => entityName)
}

/**
 * Filter breakdown data to only include top N entities
 */
export function filterToTopN(
  data: BreakdownDataPoint[],
  metric: 'revenue' | 'profit',
  n: number
): BreakdownDataPoint[] {
  const topEntities = new Set(getTopNEntities(data, metric, n))
  return data.filter(row => topEntities.has(row.entityName))
}
