/**
 * Recalculate q_gross for all pipelines using updated progress_percent
 * Uses pipelineCalculations service
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

/**
 * Calculate q_gross based on progress_percent
 * Formula: q_gross = day_gross × (progress% / 100) × delivery_days × 3_months
 * Simplified: q_gross ≈ day_gross × progress% × 90 (assuming 30 days/month × 3 months)
 */
function calculateQGross(dayGross, progressPercent, deliveryDaysPerMonth = 30) {
  if (!dayGross || dayGross === 0) return 0
  if (progressPercent === null || progressPercent === undefined) return 0

  // For 3 months (quarterly)
  const totalDays = deliveryDaysPerMonth * 3
  const q_gross = dayGross * (progressPercent / 100) * totalDays

  return Math.round(q_gross * 100) / 100 // Round to 2 decimals
}

async function recalculateRevenue() {
  console.log('🔄 Recalculating q_gross for all pipelines...\n')

  try {
    // Fetch pipelines with day_gross but need recalculation
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('id, publisher, day_gross, progress_percent, q_gross, status')
      .not('day_gross', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching pipelines:', error)
      process.exit(1)
    }

    console.log(`Found ${pipelines.length} pipelines with day_gross\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const pipeline of pipelines) {
      const newQGross = calculateQGross(pipeline.day_gross, pipeline.progress_percent)

      // Skip if already has correct value (within 0.01 tolerance)
      if (Math.abs((pipeline.q_gross || 0) - newQGross) < 0.01) {
        skipped++
        continue
      }

      // Update q_gross
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({ q_gross: newQGross })
        .eq('id', pipeline.id)

      if (updateError) {
        console.error(`❌ Error updating ${pipeline.publisher}:`, updateError.message)
        errors++
      } else {
        console.log(`✅ ${pipeline.publisher}: q_gross ${pipeline.q_gross || 0} → ${newQGross} (progress: ${pipeline.progress_percent}%)`)
        updated++

        // Slow down to avoid rate limiting
        if (updated % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`\n📊 Summary:`)
    console.log(`   Total pipelines: ${pipelines.length}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped (already correct): ${skipped}`)
    console.log(`   Errors: ${errors}`)

    console.log('\n✅ Done! Refresh your browser to see updated q_gross values in Kanban')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

recalculateRevenue()
