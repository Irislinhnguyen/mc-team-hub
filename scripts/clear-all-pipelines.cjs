#!/usr/bin/env node

/**
 * Clear ALL Pipeline Data from Database
 *
 * This script deletes ALL pipelines from the database (all users).
 * Uses service role key to bypass RLS.
 * Cascade deletes: forecasts, activity logs, sync logs.
 *
 * Usage:
 *   node scripts/clear-all-pipelines.cjs --confirm
 *   node scripts/clear-all-pipelines.cjs --dry-run
 *
 * DANGER: This is a destructive operation. Use with caution!
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isConfirmed = args.includes('--confirm')

/**
 * Initialize Supabase client with service role (bypasses RLS)
 */
function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Get current pipeline counts
 */
async function getPipelineCounts(supabase) {
  const { count: totalCount, error: countError } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw new Error(`Failed to count pipelines: ${countError.message}`)
  }

  const { count: forecastCount } = await supabase
    .from('pipeline_monthly_forecast')
    .select('*', { count: 'exact', head: true })

  const { count: activityCount } = await supabase
    .from('pipeline_activity_log')
    .select('*', { count: 'exact', head: true })

  const { count: syncLogCount } = await supabase
    .from('pipeline_sync_log')
    .select('*', { count: 'exact', head: true })

  return {
    pipelines: totalCount || 0,
    forecasts: forecastCount || 0,
    activities: activityCount || 0,
    syncLogs: syncLogCount || 0
  }
}

/**
 * Delete all pipelines (cascade deletes related records)
 */
async function deleteAllPipelines(supabase) {
  // Delete all pipelines - CASCADE will handle related tables
  const { error } = await supabase
    .from('pipelines')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Match all (no UUID matches this)

  if (error) {
    throw new Error(`Failed to delete pipelines: ${error.message}`)
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=' .repeat(60))
  console.log('🗑️  CLEAR ALL PIPELINES')
  console.log('=' .repeat(60))

  // Check for confirmation
  if (!isDryRun && !isConfirmed) {
    console.log('\n⚠️  WARNING: This will delete ALL pipelines from the database!')
    console.log('   This action cannot be undone.\n')
    console.log('Usage:')
    console.log('  node scripts/clear-all-pipelines.cjs --dry-run   # See what would be deleted')
    console.log('  node scripts/clear-all-pipelines.cjs --confirm   # Actually delete')
    process.exit(1)
  }

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be deleted\n')
  }

  try {
    // Initialize Supabase
    console.log('🔧 Initializing Supabase...')
    const supabase = initSupabase()
    console.log('   ✅ Supabase client initialized\n')

    // Get current counts
    console.log('📊 Current data counts:')
    const counts = await getPipelineCounts(supabase)
    console.log(`   - Pipelines: ${counts.pipelines}`)
    console.log(`   - Monthly Forecasts: ${counts.forecasts}`)
    console.log(`   - Activity Logs: ${counts.activities}`)
    console.log(`   - Sync Logs: ${counts.syncLogs}`)

    if (counts.pipelines === 0) {
      console.log('\n✅ No pipelines to delete. Database is already empty.')
      process.exit(0)
    }

    if (isDryRun) {
      console.log('\n🔍 DRY RUN: Would delete the above records.')
      console.log('   Run with --confirm to actually delete.')
      process.exit(0)
    }

    // Actually delete
    console.log('\n🗑️  Deleting all pipelines...')
    await deleteAllPipelines(supabase)

    // Verify deletion
    const afterCounts = await getPipelineCounts(supabase)
    console.log('\n📊 After deletion:')
    console.log(`   - Pipelines: ${afterCounts.pipelines}`)
    console.log(`   - Monthly Forecasts: ${afterCounts.forecasts}`)
    console.log(`   - Activity Logs: ${afterCounts.activities}`)
    console.log(`   - Sync Logs: ${afterCounts.syncLogs}`)

    console.log('\n' + '=' .repeat(60))
    console.log('✅ ALL PIPELINES DELETED SUCCESSFULLY')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { main }
