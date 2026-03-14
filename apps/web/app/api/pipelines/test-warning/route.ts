import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function GET() {
  const supabase = createAdminClient()

  // Get all sales pipelines for FY 2025 Q4
  const { data: pipelines, error } = await supabase
    .from('pipelines')
    .select('id, publisher, status, starting_date, poc, proposal_date, interested_date')
    .eq('group', 'sales')
    .eq('fiscal_year', 2025)
    .eq('fiscal_quarter', 4)
    .order('starting_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate warnings
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const closedStatuses = ['【S】', '【S-】', '【Z】']

  const warnings = (pipelines || [])
    .filter(p => p.starting_date && !closedStatuses.includes(p.status))
    .map(p => {
    const startDate = new Date(p.starting_date)
    startDate.setHours(0, 0, 0, 0)

    const daysRemaining = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Default avg_days_to_S for early stage
    const avgDaysToS = 42 // E → S default
    const daysNeededToSDash = avgDaysToS - 7
    const isWarning = daysNeededToSDash > 0 && daysNeededToSDash > daysRemaining

    return {
      ...p,
      daysRemaining,
      daysNeededToSDash,
      isWarning
    }
  })
    .slice(0, 10)

  return NextResponse.json({
    today: today.toISOString(),
    totalPipelines: pipelines?.length || 0,
    count: warnings.length,
    warnings: warnings.filter(w => w.isWarning),
    all: warnings
  })
}
