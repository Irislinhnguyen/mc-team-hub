/**
 * Update progress_percent for all pipelines based on their status
 * Uses Status lookup table mapping
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Status to Progress mapping from Google Sheet Status lookup table
const STATUS_PROGRESS_MAP = {
  '【S】': 0,      // Repeat reflected
  '【S-】': 100,   // Distribution started
  '【A】': 80,     // Tags sent
  '【B】': 60,     // Client agreement obtained
  '【C+】': 50,    // Client agreement (timeline undecided)
  '【C】': 30,     // Positively considering
  '【C-】': 5,     // Proposal submitted
  '【D】': 100,    // Before proposal / High certainty
  '【E】': 0,      // Low certainty
  '【F】': 0,      // Failed
  '【Z】': 0,      // Lost order
  '【X】': 0,      // Unknown
}

async function updateProgressFromStatus() {
  console.log('🔄 Updating progress_percent for all pipelines...\n')

  try {
    // Fetch all pipelines
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('id, status, progress_percent, publisher')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching pipelines:', error)
      process.exit(1)
    }

    console.log(`Found ${pipelines.length} pipelines\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const pipeline of pipelines) {
      const newProgress = STATUS_PROGRESS_MAP[pipeline.status]

      // Skip if status not in mapping
      if (newProgress === undefined) {
        console.log(`⚠️  Unknown status "${pipeline.status}" for ${pipeline.publisher}`)
        skipped++
        continue
      }

      // Skip if already has correct value
      if (pipeline.progress_percent === newProgress) {
        skipped++
        continue
      }

      // Update progress
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({ progress_percent: newProgress })
        .eq('id', pipeline.id)

      if (updateError) {
        console.error(`❌ Error updating ${pipeline.publisher}:`, updateError.message)
        errors++
      } else {
        console.log(`✅ ${pipeline.publisher}: ${pipeline.status} → ${pipeline.progress_percent}% → ${newProgress}%`)
        updated++
      }
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`\n📊 Summary:`)
    console.log(`   Total pipelines: ${pipelines.length}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Errors: ${errors}`)

    console.log('\n💡 Next step:')
    console.log('   Run recalculate script to update q_gross with new progress values')
    console.log('   node scripts/recalculate-pipeline-revenue.cjs')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

updateProgressFromStatus()
