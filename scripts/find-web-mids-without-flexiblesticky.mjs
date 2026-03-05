/**
 * Find WEB Team MIDs Without Flexible Sticky Product
 *
 * This script queries BigQuery to find all MIDs from WEB_GV and WEB_GTI teams
 * that don't have the "flexiblesticky" product.
 *
 * Results: PID, Pubname, MID, Medianame
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

async function findWebMidsWithoutFlexibleSticky() {
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
    console.log('Finding WEB Team MIDs Without Flexible Sticky Product')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month')
    console.log('='.repeat(80))
    console.log()

    // Step 1: Get PIC mappings from Supabase for WEB teams
    console.log('📋 Step 1: Fetching PIC mappings for WEB teams from Supabase...')
    console.log('-'.repeat(80))

    const { data: picMappings, error: picError } = await supabase
      .from('team_pic_mappings')
      .select('team_id, pic_name')
      .in('team_id', ['WEB_GV', 'WEB_GTI'])

    if (picError) {
      console.error('❌ Error fetching PIC mappings:', picError)
      process.exit(1)
    }

    // Group PICs by team
    const webGVPics = picMappings
      .filter(m => m.team_id === 'WEB_GV')
      .map(m => m.pic_name)

    const webGTIPics = picMappings
      .filter(m => m.team_id === 'WEB_GTI')
      .map(m => m.pic_name)

    const allWebPics = [...webGVPics, ...webGTIPics]

    console.log(`✓ WEB_GV PICs: ${webGVPics.length}`)
    console.log(`✓ WEB_GTI PICs: ${webGTIPics.length}`)
    console.log(`✓ Total WEB PICs: ${allWebPics.length}`)
    console.log()

    // Step 2: Build and execute BigQuery query
    console.log('🔍 Step 2: Querying BigQuery for MIDs without flexible sticky...')
    console.log('-'.repeat(80))

    // Dynamic import to ensure env vars are loaded
    const { default: BigQueryService } = await import('../lib/services/bigquery.js')

    // Build PIC filter for SQL
    const picFilter = allWebPics.map(pic => `'${pic}'`).join(', ')

    const query = `
      WITH flexiblesticky_mids AS (
        -- Get MIDs that HAVE flexiblesticky product (from WEB teams only)
        SELECT DISTINCT mid
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
        WHERE LOWER(product) = 'flexiblesticky'
          AND pic IN (${picFilter})
      )
      SELECT DISTINCT
        pid,
        pubname,
        mid,
        medianame,
        pic
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE pic IN (${picFilter})
        AND mid NOT IN (SELECT mid FROM flexiblesticky_mids)
        AND mid IS NOT NULL
        AND pid IS NOT NULL
      ORDER BY pid, mid
    `

    console.log(`📝 SQL Query (using ${allWebPics.length} PICs):`)
    console.log(query)
    console.log()

    const rows = await BigQueryService.executeQuery(query)

    if (rows.length === 0) {
      console.log('✅ No WEB team MIDs found without flexible sticky product')
    } else {
      console.log(`📊 Found ${rows.length} WEB team MIDs WITHOUT flexible sticky product`)
      console.log()
      console.log('Results:')
      console.log('-'.repeat(80))

      // Display table header
      const pidWidth = 10
      const pubnameWidth = 40
      const midWidth = 15
      const medianameWidth = 50
      const picWidth = 20

      console.log(
        `${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)} | ${'MID'.padEnd(midWidth)} | ${'PIC'.padEnd(picWidth)} | ${'Medianame'.padEnd(medianameWidth)}`
      )
      console.log('-'.repeat(80))

      // Display each row
      rows.forEach((row, index) => {
        const pid = String(row.pid || '').padEnd(pidWidth)
        const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)
        const mid = String(row.mid || '').padEnd(midWidth)
        const pic = String(row.pic || '').substring(0, picWidth).padEnd(picWidth)
        const medianame = String(row.medianame || '').substring(0, medianameWidth).padEnd(medianameWidth)

        console.log(`${pid} | ${pubname} | ${mid} | ${pic} | ${medianame}`)

        // Add separator every 50 rows for readability
        if ((index + 1) % 50 === 0 && index < rows.length - 1) {
          console.log('-'.repeat(80))
        }
      })
    }

    console.log()
    console.log('='.repeat(80))
    console.log('Summary:')
    console.log(`  Total WEB team MIDs without flexible sticky: ${rows.length}`)
    console.log('='.repeat(80))

    // Step 3: Save to CSV
    console.log()
    console.log('💾 Step 3: Saving results to CSV...')
    console.log('-'.repeat(80))

    const csvFileName = 'web-mids-without-flexiblesticky.csv'
    const csvFilePath = path.join(projectRoot, csvFileName)

    // Create CSV content
    const csvHeader = 'PID,Pubname,MID,Medianame,PIC\n'
    const csvRows = rows.map(row => {
      const pid = row.pid || ''
      const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
      const mid = row.mid || ''
      const medianame = `"${String(row.medianame || '').replace(/"/g, '""')}"`
      const pic = row.pic || ''
      return `${pid},${pubname},${mid},${medianame},${pic}`
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

findWebMidsWithoutFlexibleSticky()
