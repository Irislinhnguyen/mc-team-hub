/**
 * Check pipeline details for PID 38421
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sswhlmympcxnrtznqpgr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzd2hsbXltcGN4bnJ0em5xcGdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMxNjU0MiwiZXhwIjoyMDgyODkyNTQyfQ.Q6Vd99ZKt9b3E7M31qPKDVkhNeFbA91a2Id3AevcLqU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPipeline() {
  console.log('\n========== Checking Pipelines with PID 38421 ==========\n')

  const { data: pipelines, error } = await supabase
    .from('pipelines')
    .select('*')
    .eq('pid', '38421')

  if (error) {
    console.error('Error fetching pipelines:', error)
    return
  }

  if (pipelines.length === 0) {
    console.log('❌ No pipelines found with PID 38421')
    return
  }

  console.log(`✓ Found ${pipelines.length} pipeline(s) with PID 38421:\n`)

  pipelines.forEach((p, idx) => {
    console.log(`\n--- Pipeline ${idx + 1} ---`)
    console.log(`ID: ${p.id}`)
    console.log(`Publisher: ${p.publisher}`)
    console.log(`PID: ${p.pid}`)
    console.log(`MID: ${p.mid || 'NULL'}`)
    console.log(`Zones: ${p.affected_zones ? JSON.stringify(p.affected_zones) : 'NULL'}`)
    console.log(`Status: ${p.status}`)
    console.log(`Classification: ${p.classification || 'NULL'}`)
    console.log(`Actual Starting Date: ${p.actual_starting_date || 'NULL'}`)
    console.log(`Starting Date: ${p.starting_date || 'NULL'}`)
    console.log(`Day Gross: ${p.day_gross || 0}`)
    console.log(`Impact Cached Value: ${p.impact_cached_value || 0}`)
    console.log(`Impact Last Calculated: ${p.impact_last_calculated || 'NULL'}`)
  })

  console.log('\n' + '='.repeat(60) + '\n')
}

checkPipeline().catch(console.error)
