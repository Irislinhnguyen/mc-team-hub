/**
 * Sales Cycle Breakdown API
 * GET  /api/pipelines/sales-cycle-breakdown
 *
 * Returns average days spent in each stage transition for pipelines.
 * NOW USES direct date columns from pipelines table instead of activity logs.
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

// Transition names - same as before
const TRANSITION_NAMES = {
  earlyToConsideration: '【E】/【D】 → 【C+】/【C】/【C-】',
  considerationToAgreement: '【C+】/【C】/【C-】 → 【B】',
  agreementToClosing: '【B】 → 【A】',
  closingToDistribution: '【A】 → 【S-】',
  distributionToWon: '【S-】 → 【S】',
} as const

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

    // Validate required params
    if (!group || !['sales', 'cs'].includes(group)) {
      return NextResponse.json(
        { error: 'Invalid or missing group parameter. Must be "sales" or "cs".' },
        { status: 400 }
      )
    }

    // Build query to fetch pipelines with their date tracking columns
    let pipelinesQuery = supabase
      .from('pipelines')
      .select(`
        id,
        status,
        proposal_date,
        interested_date,
        acceptance_date,
        ready_to_deliver_date,
        actual_starting_date,
        starting_date
      `)
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
      console.error('[Sales Cycle Breakdown API] Error fetching pipelines:', pipelinesError)
      return NextResponse.json(
        { error: 'Failed to fetch pipelines' },
        { status: 500 }
      )
    }

    if (!filteredPipelines || filteredPipelines.length === 0) {
      return NextResponse.json({
        data: {
          transitions: {
            [TRANSITION_NAMES.earlyToConsideration]: { avg_days: null, count: 0 },
            [TRANSITION_NAMES.considerationToAgreement]: { avg_days: null, count: 0 },
            [TRANSITION_NAMES.agreementToClosing]: { avg_days: null, count: 0 },
            [TRANSITION_NAMES.closingToDistribution]: { avg_days: null, count: 0 },
            [TRANSITION_NAMES.distributionToWon]: { avg_days: null, count: 0 },
          },
          total_cycle: { avg_days: null, count: 0 },
        }
      })
    }

    // Calculate transition days using direct date columns
    const earlyToConsiderationDays: number[] = []
    const considerationToAgreementDays: number[] = []
    const agreementToClosingDays: number[] = []
    const closingToDistributionDays: number[] = []
    const distributionToWonDays: number[] = []
    const fullCycleDays: number[] = []

    for (const pipeline of filteredPipelines) {
      // Skip if no proposal date (can't calculate from start)
      if (!pipeline.proposal_date) continue

      const proposalDate = new Date(pipeline.proposal_date)

      // 1. Early → Consideration: proposal_date to interested_date
      if (pipeline.interested_date) {
        const interestedDate = new Date(pipeline.interested_date)
        const days = Math.ceil((interestedDate.getTime() - proposalDate.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) {
          earlyToConsiderationDays.push(days)
        }
      }

      // 2. Consideration → Agreement: interested_date to acceptance_date
      if (pipeline.interested_date && pipeline.acceptance_date) {
        const interestedDate = new Date(pipeline.interested_date)
        const acceptanceDate = new Date(pipeline.acceptance_date)
        const days = Math.ceil((acceptanceDate.getTime() - interestedDate.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) {
          considerationToAgreementDays.push(days)
        }
      }

      // 3. Agreement → Closing: acceptance_date to ready_to_deliver_date
      if (pipeline.acceptance_date && pipeline.ready_to_deliver_date) {
        const acceptanceDate = new Date(pipeline.acceptance_date)
        const readyDate = new Date(pipeline.ready_to_deliver_date)
        const days = Math.ceil((readyDate.getTime() - acceptanceDate.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) {
          agreementToClosingDays.push(days)
        }
      }

      // 4. Closing → Distribution: ready_to_deliver_date to S- date
      // For S- status: starting_date IS the S- date
      if (pipeline.status === '【S-】' && pipeline.ready_to_deliver_date && pipeline.starting_date) {
        const readyDate = new Date(pipeline.ready_to_deliver_date)
        const sDashDate = new Date(pipeline.starting_date)
        const days = Math.ceil((sDashDate.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) {
          closingToDistributionDays.push(days)
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
          closingToDistributionDays.push(days)
        }
      }

      // 5. Distribution → Won: Always 7 days by business definition
      // Count pipelines that have reached S status
      if (pipeline.status === '【S】') {
        distributionToWonDays.push(7) // Always 7 days by definition
      }

      // Full Cycle: proposal_date to starting_date (when status is S)
      // starting_date represents S date when status is S
      if (pipeline.status === '【S】' && pipeline.starting_date) {
        const closeWonDate = new Date(pipeline.starting_date)
        const days = Math.ceil((closeWonDate.getTime() - proposalDate.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) {
          fullCycleDays.push(days)
        }
      }
    }

    // Calculate averages
    const calcAvg = (days: number[]) => {
      return days.length > 0
        ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
        : null
    }

    const transitionsResult = {
      [TRANSITION_NAMES.earlyToConsideration]: {
        avg_days: calcAvg(earlyToConsiderationDays),
        count: earlyToConsiderationDays.length
      },
      [TRANSITION_NAMES.considerationToAgreement]: {
        avg_days: calcAvg(considerationToAgreementDays),
        count: considerationToAgreementDays.length
      },
      [TRANSITION_NAMES.agreementToClosing]: {
        avg_days: calcAvg(agreementToClosingDays),
        count: agreementToClosingDays.length
      },
      [TRANSITION_NAMES.closingToDistribution]: {
        avg_days: calcAvg(closingToDistributionDays),
        count: closingToDistributionDays.length
      },
      [TRANSITION_NAMES.distributionToWon]: {
        avg_days: calcAvg(distributionToWonDays),
        count: distributionToWonDays.length
      },
    }

    return NextResponse.json({
      data: {
        transitions: transitionsResult,
        total_cycle: {
          avg_days: calcAvg(fullCycleDays),
          count: fullCycleDays.length,
        },
      }
    })

  } catch (error) {
    console.error('[Sales Cycle Breakdown API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
