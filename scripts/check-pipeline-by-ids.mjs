/**
 * Check pipeline by ID, PID, or MID
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sswhlmympcxnrtznqpgr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzd2hsbXltcGN4bnJ0em5xcGdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMxNjU0MiwiZXhwIjoyMDgyODkyNTQyfQ.Q6Vd99ZKt9b3E7M31qPKDVkhNeFbA91a2Id3AevcLqU'

const supabase = createClient(supabaseUrl, supabaseKey)

const IDs = ['27191', '176109', '1528467']

async function checkPipeline() {
  console.log('\n========== Searching for Pipeline ==========\n')
  console.log('Looking for IDs:', IDs)
  console.log()

  // Try each ID as pipeline_id, pid, and mid
  for (const id of IDs) {
    console.log(`\n--- Searching for ID: ${id} ---\n`)

    // Search by pipeline_id
    const { data: byId, error: errId } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)

    if (!errId && byId && byId.length > 0) {
      console.log(`✓ Found by pipeline_id (${byId.length} result(s))`)
      byId.forEach(p => printPipeline(p))
      continue
    }

    // Search by pid
    const { data: byPid, error: errPid } = await supabase
      .from('pipelines')
      .select('*')
      .eq('pid', id)

    if (!errPid && byPid && byPid.length > 0) {
      console.log(`✓ Found by pid (${byPid.length} result(s))`)
      byPid.forEach(p => printPipeline(p))
      continue
    }

    // Search by mid
    const { data: byMid, error: errMid } = await supabase
      .from('pipelines')
      .select('*')
      .eq('mid', id)

    if (!errMid && byMid && byMid.length > 0) {
      console.log(`✓ Found by mid (${byMid.length} result(s))`)
      byMid.forEach(p => printPipeline(p))
      continue
    }

    console.log(`❌ No pipeline found with ID ${id}`)
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

function printPipeline(p) {
  console.log(`\nPipeline Details:`)
  console.log(`  ID: ${p.id}`)
  console.log(`  Publisher: ${p.publisher}`)
  console.log(`  PID: ${p.pid || 'NULL'}`)
  console.log(`  MID: ${p.mid || 'NULL'}`)
  console.log(`  Zones: ${p.affected_zones ? JSON.stringify(p.affected_zones) : 'NULL'}`)
  console.log(`  Status: ${p.status}`)
  console.log(`  Classification: ${p.classification || 'NULL'}`)
  console.log(`  Actual Starting Date: ${p.actual_starting_date || 'NULL'}`)
  console.log(`  Starting Date: ${p.starting_date || 'NULL'}`)
  console.log(`  Day Gross: ${p.day_gross || 0}`)
  console.log(`  Projected 30d: $${(p.day_gross || 0) * 30}`)
  console.log(`  Actual 30d: ${p.impact_cached_value || 0}`)
  console.log(`  Variance: ${(p.impact_cached_value || 0) - ((p.day_gross || 0) * 30)}`)

  // Calculate variance percentage
  const projected = (p.day_gross || 0) * 30
  const actual = p.impact_cached_value || 0
  const variance = actual - projected
  const variancePercent = projected !== 0 ? (variance / projected) * 100 : (actual > 0 ? 100 : -100)

  console.log(`  Variance %: ${variancePercent.toFixed(1)}%`)
  console.log(`  Impact Last Calculated: ${p.impact_last_calculated || 'NULL'}`)

  // Explain the calculation
  console.log(`\n  Calculation Logic:`)
  console.log(`    Projected 30d = day_gross × 30 = ${p.day_gross || 0} × 30 = $${projected}`)
  console.log(`    Actual 30d = BigQuery revenue = $${actual}`)
  console.log(`    Variance = Actual - Projected = ${actual} - ${projected} = $${variance}`)

  if (p.classification && p.classification.includes('Slot exists')) {
    console.log(`\n  Note: This is an "Existing Slot" pipeline`)
    console.log(`    Actual 30d = (After period revenue) - (Baseline period revenue)`)
    console.log(`    Baseline = 30 days BEFORE starting_date`)
    console.log(`    After period = 30 days AFTER starting_date`)
  }
}

checkPipeline().catch(console.error)
