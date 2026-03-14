/**
 * Test Template Execution Endpoint
 * Tests actual templates from lib/templates with proper parameters
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import {
  performanceTemplates,
  predictionTemplates,
  formatTemplates,
  customerRiskTemplates,
  salesRevenueTemplates,
} from '../../../../lib/templates'
import { AnalyticsTemplate } from '../../../../lib/templates/types'

interface TestTemplateRequest {
  templateId: string
  params?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body: TestTemplateRequest = await request.json()
    const { templateId, params = {} } = body

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      )
    }

    // Find template from all categories
    const allTemplates: AnalyticsTemplate[] = [
      ...performanceTemplates,
      ...predictionTemplates,
      ...formatTemplates,
      ...customerRiskTemplates,
      ...salesRevenueTemplates,
    ]

    const template = allTemplates.find(t => t.id === templateId)

    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      )
    }

    console.log(`[Template Test] Testing template: ${templateId}`)
    console.log(`[Template Test] Params:`, params)

    // Build query using template's buildQuery function
    const query = template.buildQuery(params)
    console.log(`[Template Test] Generated query length: ${query.length}`)

    // Execute query
    const startTime = Date.now()
    const rows = await BigQueryService.executeQuery(query)
    const executionTime = Date.now() - startTime

    console.log(`[Template Test] Executed in ${executionTime}ms, returned ${rows.length} rows`)

    return NextResponse.json(
      {
        status: 'success',
        templateId,
        templateTitle: template.title,
        templateDescription: template.description,
        params,
        query: query.substring(0, 500) + (query.length > 500 ? '...' : ''),
        rowCount: rows.length,
        executionTimeMs: executionTime,
        sampleData: rows.slice(0, 5),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Template Test] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // List available test templates
  const testScenarios = {
    scenario1: {
      name: 'Scenario 1: Daily vs 30-Day Average',
      templateId: 'team_daily_vs_30d',
      params: { team: 'All Teams', metric: 'revenue', drill_down: 'none' },
      description: 'Compare daily performance vs 30-day average',
    },
    scenario2: {
      name: 'Scenario 2: Top 20 Publishers',
      templateId: 'top_publishers_by_metric',
      params: { metric: 'revenue', limit: '20', period: 'this month' },
      description: 'Show top 20 publishers by revenue',
    },
    scenario3: {
      name: 'Scenario 3: Churn Risk Detection',
      templateId: 'churn_risk_detector',
      params: { risk_threshold: '50', min_historical_revenue: '5000' },
      description: 'Identify at-risk publishers',
    },
    scenario4: {
      name: 'Scenario 4: Format Growth & Decline',
      templateId: 'adformat_growth_decline',
      params: { metric: 'revenue', compare_to: 'last month' },
      description: 'Track ad format trending',
    },
    scenario5: {
      name: 'Scenario 5: Team Performance',
      templateId: 'team_prediction_breakdown',
      params: { metric: 'revenue', days_back: '30' },
      description: 'Compare team performance',
    },
  }

  const scenario = searchParams.get('scenario') as keyof typeof testScenarios

  if (scenario && testScenarios[scenario]) {
    return NextResponse.json({
      status: 'test_scenario',
      ...testScenarios[scenario],
      instruction: 'POST this to test endpoint with body: { templateId, params }',
    })
  }

  return NextResponse.json({
    status: 'template_test_endpoint',
    description: 'Test analytics templates from lib/templates',
    usage: {
      method: 'POST',
      url: '/api/test/templates',
      body: {
        templateId: 'template_id_here',
        params: { /* template-specific parameters */ },
      },
    },
    availableScenarios: Object.keys(testScenarios),
    exampleUrl: 'Add ?scenario=scenario1 to get example test cases',
    testScenarios,
  })
}
