/**
 * Find APP Team Publishers Without Revenue from June 2025
 *
 * This script queries BigQuery to find all publishers (PID, Pubname) from APP teams
 * that don't have revenue from June 2025 till now (February 2026).
 *
 * Results: PID, Pubname
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env.local explicitly BEFORE importing anything else
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function findAppPublishersNoRevenue() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
      process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    console.log('='.repeat(80))
    console.log('Finding APP Team Publishers Without Revenue from June 2025')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table')
    console.log('Date Range: Before 2025-06 vs 2025-06 onwards')
    console.log('='.repeat(80))
    console.log()

    // Step 1: Get PIC mappings from Supabase for APP teams
    console.log('📋 Step 1: Fetching PIC mappings for APP teams from Supabase...')
    console.log('-'.repeat(80))

    // First, let's see what teams start with APP
    const { data: allTeams, error: teamsError } = await supabase
      .from('team_pic_mappings')
      .select('team_id')
      .like('team_id', 'APP%')

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError)
      process.exit(1)
    }

    // Get unique team IDs that start with APP
    const appTeamIds = [...new Set(allTeams?.map(t => t.team_id) || [])]
    console.log(`✓ Found APP teams: ${appTeamIds.join(', ')}`)
    console.log()

    const { data: picMappings, error: picError } = await supabase
      .from('team_pic_mappings')
      .select('team_id, pic_name')
      .in('team_id', appTeamIds)

    if (picError) {
      console.error('❌ Error fetching PIC mappings:', picError)
      process.exit(1)
    }

    const appPics = picMappings.map(m => m.pic_name)

    console.log(`✓ Total APP PICs: ${appPics.length}`)
    console.log(`✓ PICs: ${appPics.join(', ')}`)
    console.log()

    // Step 2: Build and execute BigQuery query
    console.log('🔍 Step 2: Querying BigQuery for publishers without revenue since June 2025...')
    console.log('-'.repeat(80))

    // Dynamic import to ensure env vars are loaded
    const { default: BigQueryService } = await import('../lib/services/bigquery.js')

    // Build PIC filter for SQL
    const picFilter = appPics.map(pic => `'${pic}'`).join(', ')

    const query = `
      WITH publishers_before_jun2025 AS (
        -- Get publishers that HAD revenue BEFORE June 2025
        SELECT DISTINCT
          pid,
          pubname
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
        WHERE pic IN (${picFilter})
          AND (
            (year < 2025) OR
            (year = 2025 AND month < 6)
          )
          AND pid IS NOT NULL
      ),
      publishers_with_recent_revenue AS (
        -- Get publishers that HAVE revenue from June 2025 onwards
        SELECT DISTINCT
          pid
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
        WHERE pic IN (${picFilter})
          AND (
            (year = 2025 AND month >= 6) OR
            (year = 2026 AND month <= 2)
          )
          AND pid IS NOT NULL
      )
      SELECT
        p.pid,
        p.pubname
      FROM publishers_before_jun2025 p
      WHERE p.pid NOT IN (SELECT pid FROM publishers_with_recent_revenue)
      ORDER BY p.pid
    `

    console.log(`📝 SQL Query (using ${appPics.length} PICs):`)
    console.log(query)
    console.log()

    const rows = await BigQueryService.executeQuery(query)

    if (rows.length === 0) {
      console.log('✅ No APP team publishers found without revenue since June 2025')
    } else {
      console.log(`📊 Found ${rows.length} APP team publishers WITHOUT revenue since June 2025`)
      console.log()
      console.log('Results:')
      console.log('-'.repeat(80))

      // Display table header
      const pidWidth = 10
      const pubnameWidth = 80

      console.log(
        `${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)}`
      )
      console.log('-'.repeat(80))

      // Display each row
      rows.forEach((row, index) => {
        const pid = String(row.pid || '').padEnd(pidWidth)
        const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)

        console.log(`${pid} | ${pubname}`)

        // Add separator every 50 rows for readability
        if ((index + 1) % 50 === 0 && index < rows.length - 1) {
          console.log('-'.repeat(80))
        }
      })
    }

    console.log()
    console.log('='.repeat(80))
    console.log('Summary:')
    console.log(`  Total APP team publishers without revenue since June 2025: ${rows.length}`)
    console.log('='.repeat(80))

    // Step 3: Save to CSV
    console.log()
    console.log('💾 Step 3: Saving results to CSV...')
    console.log('-'.repeat(80))

    const csvFileName = 'app-publishers-no-revenue-since-jun2025.csv'
    const csvFilePath = path.join(projectRoot, csvFileName)

    // Create CSV content
    const csvHeader = 'PID,Pubname\n'
    const csvRows = rows.map(row => {
      const pid = row.pid || ''
      const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
      return `${pid},${pubname}`
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // Write to file
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8')

    console.log(`✅ CSV saved to: ${csvFilePath}`)
    console.log(`📄 File name: ${csvFileName}`)
    console.log(`📊 Total rows: ${rows.length}`)
  } catch (error) {
    console.error('❌ Error executing query:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

findAppPublishersNoRevenue()
