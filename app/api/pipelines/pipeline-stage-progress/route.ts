/**
 * Pipeline Stage Progress API
 * GET  /api/pipelines/pipeline-stage-progress
 *
 * Returns for each pipeline:
 * - Current status and stage group
 * - Date when pipeline entered its current stage
 * - POC-specific average days remaining to S
 * - Expected date to reach S
 *
 * NOW USES direct date columns from pipelines table for POC-specific averages.
 *
 * Query Parameters:
 * - group (required): 'sales' or 'cs'
 * - fiscal_year (optional): Filter by fiscal year
 * - fiscal_quarter (optional): Filter by fiscal quarter
 * - teams (optional): Array of team names to filter
 * - pocs (optional): Array of POC names to filter
 * - products (optional): Array of products to filter
 * - statuses (optional): Array of status codes to filter
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'

// Stage groups for transitions
const STAGE_GROUPS = {
  early: ['【E】', '【D】'],
  consideration: ['【C+】', '【C】', '【C-】'],
  agreement: ['【B】'],
  closing: ['【A】'],
  distributionStarted: ['【S-】'],
  won: ['【S】'],
} as const

// Transition definitions
const TRANSITIONS = [
  { from: 'early', to: 'consideration', name: 'earlyToConsideration' },
  { from: 'consideration', to: 'agreement', name: 'considerationToAgreement' },
  { from: 'agreement', to: 'closing', name: 'agreementToClosing' },
  { from: 'closing', to: 'distributionStarted', name: 'closingToDistribution' },
  { from: 'distributionStarted', to: 'won', name: 'distributionToWon' },
] as const

// Stage group order
const STAGE_ORDER = ['early', 'consideration', 'agreement', 'closing', 'distributionStarted', 'won'] as const

// Helper to get stage group
function getStageGroup(stage: string): string | null {
  if (STAGE_GROUPS.early.includes(stage)) return 'early'
  if (STAGE_GROUPS.consideration.includes(stage)) return 'consideration'
  if (STAGE_GROUPS.agreement.includes(stage)) return 'agreement'
  if (STAGE_GROUPS.closing.includes(stage)) return 'closing'
  if (STAGE_GROUPS.distributionStarted.includes(stage)) return 'distributionStarted'
  if (STAGE_GROUPS.won.includes(stage)) return 'won'
  return null
}

// Get the index of a stage group in the order
function getStageIndex(stageGroup: string): number {
  return STAGE_ORDER.indexOf(stageGroup as typeof STAGE_ORDER[number])
}

// Calculate POC-specific average days for each transition using direct date columns
// Falls back to global averages when POC has insufficient data
async function calculatePocSpecificAverages(
  supabase: any,
  pipelineIds: string[],
  pocPipelines: Map<string, string[]> // Map of POC -> pipeline IDs
): Promise<Map<string, Map<string, number>>> {
  const pocAverages = new Map<string, Map<string, number>>()

  // Initialize with empty maps for each POC
  for (const [poc, _] of pocPipelines.entries()) {
    pocAverages.set(poc, new Map())
  }

  // Fetch all pipelines with their date tracking columns
  const batchSize = 100
  const allPipelines: any[] = []

  for (let i = 0; i < pipelineIds.length; i += batchSize) {
    const batch = pipelineIds.slice(i, i + batchSize)
    const { data: batchPipelines, error: batchError } = await supabase
      .from('pipelines')
      .select('id, poc, status, starting_date, proposal_date, interested_date, acceptance_date, ready_to_deliver_date, actual_starting_date')
      .in('id', batch)

    if (batchError) {
      console.error('[Pipeline Stage Progress API] Error fetching pipelines batch:', batchError)
      continue
    }
    if (batchPipelines) {
      allPipelines.push(...batchPipelines)
    }
  }

  // Build reverse map: pipeline_id -> POC
  const pipelineToPoc = new Map<string, string>()
  for (const [poc, pipeIds] of pocPipelines.entries()) {
    for (const pipeId of pipeIds) {
      pipelineToPoc.set(pipeId, poc)
    }
  }

  // Calculate transition days grouped by POC
  const pocTransitionDays: Map<string, Map<string, number[]>> = new Map()

  // Initialize for each POC
  for (const [poc, _] of pocPipelines.entries()) {
    const transitionMap = new Map<string, number[]>()
    TRANSITIONS.forEach(t => transitionMap.set(t.name, []))
    pocTransitionDays.set(poc, transitionMap)
  }

  // Also track global averages across all POCs
  const globalTransitionDays = new Map<string, number[]>()
  TRANSITIONS.forEach(t => globalTransitionDays.set(t.name, []))

  // Process each pipeline's date history
  for (const pipeline of allPipelines) {
    const poc = pipelineToPoc.get(pipeline.id)
    if (!poc) continue

    // Skip if no proposal date
    if (!pipeline.proposal_date) continue

    const proposalDate = new Date(pipeline.proposal_date)
    const transitionDays = pocTransitionDays.get(poc)!

    // Helper to add days to both POC and global collections
    const addDays = (transitionName: string, days: number) => {
      transitionDays.get(transitionName)!.push(days)
      globalTransitionDays.get(transitionName)!.push(days)
    }

    // 1. Early → Consideration: proposal_date to interested_date
    if (pipeline.interested_date) {
      const interestedDate = new Date(pipeline.interested_date)
      const days = Math.ceil((interestedDate.getTime() - proposalDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        addDays('earlyToConsideration', days)
      }
    }

    // 2. Consideration → Agreement: interested_date to acceptance_date
    if (pipeline.interested_date && pipeline.acceptance_date) {
      const interestedDate = new Date(pipeline.interested_date)
      const acceptanceDate = new Date(pipeline.acceptance_date)
      const days = Math.ceil((acceptanceDate.getTime() - interestedDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        addDays('considerationToAgreement', days)
      }
    }

    // 3. Agreement → Closing: acceptance_date to ready_to_deliver_date
    if (pipeline.acceptance_date && pipeline.ready_to_deliver_date) {
      const acceptanceDate = new Date(pipeline.acceptance_date)
      const readyDate = new Date(pipeline.ready_to_deliver_date)
      const days = Math.ceil((readyDate.getTime() - acceptanceDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        addDays('agreementToClosing', days)
      }
    }

    // 4. Closing → Distribution: ready_to_deliver_date to S- date
    // For S- status: starting_date IS the S- date
    if (pipeline.status === '【S-】' && pipeline.ready_to_deliver_date && pipeline.starting_date) {
      const readyDate = new Date(pipeline.ready_to_deliver_date)
      const sDashDate = new Date(pipeline.starting_date)
      const days = Math.ceil((sDashDate.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        addDays('closingToDistribution', days)
      }
    }
    // For S status: starting_date IS the S date, so S- date = starting_date - 7 days
    if (pipeline.status === '【S】' && pipeline.ready_to_deliver_date && pipeline.starting_date) {
      const readyDate = new Date(pipeline.ready_to_deliver_date)
      const sDate = new Date(pipeline.starting_date)
      // S- date is 7 days before S date
      const sDashDate = new Date(sDate)
      sDashDate.setDate(sDashDate.getDate() - 7)
      const days = Math.ceil((sDashDate.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        addDays('closingToDistribution', days)
      }
    }

    // 5. Distribution → Won: Always 7 days by business definition
    if (pipeline.status === '【S】') {
      addDays('distributionToWon', 7) // Always 7 days
    }
  }

  // Calculate global averages first (fallback for POCs with no data)
  const globalAverages = new Map<string, number>()

  // Default estimates for transitions with no historical data
  const DEFAULTS: Record<string, number> = {
    earlyToConsideration: 14,      // E/D to C+: 2 weeks default
    considerationToAgreement: 7,   // C to B: 1 week default
    agreementToClosing: 7,         // B to A: 1 week default
    closingToDistribution: 7,      // A to S-: 1 week default (NO S- pipelines exist!)
    distributionToWon: 7,          // S- to S: always 7 days by definition
  }

  for (const transition of TRANSITIONS) {
    const days = globalTransitionDays.get(transition.name)!
    const avgDays = days.length > 0
      ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      : DEFAULTS[transition.name] || 7  // Use default if no samples
    globalAverages.set(transition.name, avgDays)
  }

  // Calculate averages for each POC, using global averages as fallback
  for (const [poc, transitionDays] of pocTransitionDays.entries()) {
    const averages = new Map<string, number>()
    for (const transition of TRANSITIONS) {
      const days = transitionDays.get(transition.name)!
      // Use POC-specific average if available, otherwise fall back to global average
      const avgDays = days.length > 0
        ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
        : globalAverages.get(transition.name) || DEFAULTS[transition.name] || 7
      averages.set(transition.name, avgDays)
    }
    pocAverages.set(poc, averages)
  }

  return pocAverages
}

// Calculate total days remaining from a stage group to reach 'won'
// Uses POC-specific averages for each transition
function calculateDaysToWon(
  currentStageGroup: string,
  pocAverages: Map<string, number>
): number {
  const currentIndex = getStageIndex(currentStageGroup)
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return 0 // Already at or past 'won'
  }

  let totalDays = 0

  // Sum up averages for all remaining transitions
  for (let i = currentIndex; i < STAGE_ORDER.length - 1; i++) {
    const fromStage = STAGE_ORDER[i]
    const toStage = STAGE_ORDER[i + 1]

    // Find the transition that matches this stage pair
    const transition = TRANSITIONS.find(t => t.from === fromStage && t.to === toStage)
    if (transition) {
      const avgDays = pocAverages.get(transition.name) || 0
      totalDays += avgDays
    }
  }

  return totalDays
}

// Get the current stage entry date based on the status
function getCurrentStageEntryDate(pipeline: any): string | null {
  const status = pipeline.status

  // Map status to the corresponding date column
  if (STAGE_GROUPS.won.includes(status)) {
    // For S status, starting_date IS the S date (when deal was won)
    return pipeline.starting_date
  }
  if (STAGE_GROUPS.distributionStarted.includes(status)) {
    // For S- status, starting_date IS the S- date (when distribution started)
    return pipeline.starting_date
  }
  if (STAGE_GROUPS.closing.includes(status)) {
    return pipeline.ready_to_deliver_date
  }
  if (STAGE_GROUPS.agreement.includes(status)) {
    return pipeline.acceptance_date
  }
  if (STAGE_GROUPS.consideration.includes(status)) {
    return pipeline.interested_date
  }
  if (STAGE_GROUPS.early.includes(status)) {
    return pipeline.proposal_date
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Get query params
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')
    const fiscalYear = searchParams.get('fiscal_year')
    const fiscalQuarter = searchParams.get('fiscal_quarter')
    const teamsParam = searchParams.get('teams')
    const pocsParam = searchParams.get('pocs')
    const productsParam = searchParams.get('products')
    const statusesParam = searchParams.get('statuses')

    // DEBUG: Log the incoming request
    console.log('[Pipeline Stage Progress API] Incoming request:', {
      group,
      fiscalYear,
      fiscalQuarter,
      url: request.url
    })

    // Validate required params
    if (!group || !['sales', 'cs'].includes(group)) {
      return NextResponse.json(
        { error: 'Invalid or missing group parameter. Must be "sales" or "cs".' },
        { status: 400 }
      )
    }

    // Build base query for pipelines with filters - fetch all needed columns
    let pipelinesQuery = supabase
      .from('pipelines')
      .select('id, poc, status, starting_date, proposal_date, interested_date, acceptance_date, ready_to_deliver_date, actual_starting_date')
      .eq('group', group)

    if (fiscalYear) {
      pipelinesQuery = pipelinesQuery.eq('fiscal_year', parseInt(fiscalYear))
    }
    if (fiscalQuarter) {
      pipelinesQuery = pipelinesQuery.eq('fiscal_quarter', parseInt(fiscalQuarter))
    }
    if (teamsParam) {
      const teams = teamsParam.split(',')
      pipelinesQuery = pipelinesQuery.in('team', teams)
    }
    if (pocsParam) {
      const pocs = pocsParam.split(',')
      pipelinesQuery = pipelinesQuery.in('poc', pocs)
    }
    if (statusesParam) {
      const statuses = statusesParam.split(',')
      pipelinesQuery = pipelinesQuery.in('status', statuses)
    }
    if (productsParam) {
      const products = productsParam.split(',')
      products.forEach(product => {
        pipelinesQuery = pipelinesQuery.or(`product.ilike.%${product}%,product.ilike.%${product},product.ilike.${product}`)
      })
    }

    const { data: filteredPipelines, error: pipelinesError } = await pipelinesQuery

    if (pipelinesError) {
      console.error('[Pipeline Stage Progress API] Error fetching pipelines:', pipelinesError)
      return NextResponse.json(
        { error: 'Failed to fetch pipelines' },
        { status: 500 }
      )
    }

    if (!filteredPipelines || filteredPipelines.length === 0) {
      return NextResponse.json({
        data: {
          pipelines: []
        }
      })
    }

    // Group pipelines by POC
    const pocPipelines = new Map<string, string[]>()
    for (const p of filteredPipelines) {
      if (!p.poc) continue
      if (!pocPipelines.has(p.poc)) {
        pocPipelines.set(p.poc, [])
      }
      pocPipelines.get(p.poc)!.push(p.id)
    }

    // Get all pipeline IDs
    const allPipelineIds = filteredPipelines.map(p => p.id)

    // Calculate POC-specific averages
    const pocAverages = await calculatePocSpecificAverages(supabase, allPipelineIds, pocPipelines)

    // Build response - now using getCurrentStageEntryDate
    const pipelines = filteredPipelines.map(p => {
      const poc = p.poc || 'Unknown'

      // Get POC-specific averages, or empty map if POC not found
      const averages = pocAverages.get(poc) || new Map<string, number>()

      // Get current stage group
      const currentStageGroup = getStageGroup(p.status)

      // Get the entry date for the current stage
      const currentStageEntryDate = getCurrentStageEntryDate(p)

      // Calculate days to S based on current stage
      let avgDaysToS: number | null = null
      let expectedSDate: string | null = null

      if (currentStageGroup && currentStageEntryDate) {
        avgDaysToS = calculateDaysToWon(currentStageGroup, averages)

        // Calculate expected S date
        const entryDate = new Date(currentStageEntryDate)
        const expectedDate = new Date(entryDate)
        expectedDate.setDate(expectedDate.getDate() + avgDaysToS)
        expectedSDate = expectedDate.toISOString()
      }

      return {
        pipeline_id: p.id,
        poc: poc,
        current_status: p.status,
        current_stage_group: currentStageGroup,
        current_stage_entry_date: currentStageEntryDate,
        avg_days_to_S: avgDaysToS,
        expected_S_date: expectedSDate,
      }
    })

    console.log('[Pipeline Stage Progress API] Returning:', {
      totalPipelines: pipelines.length,
      withAvgDays: pipelines.filter(p => p.avg_days_to_S !== null).length
    })

    return NextResponse.json({
      data: {
        pipelines
      }
    })

  } catch (error) {
    console.error('[Pipeline Stage Progress API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
