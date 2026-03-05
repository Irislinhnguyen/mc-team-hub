/**
 * Script to fetch top 200 publishers from BigQuery and export to CSV
 * Matches format: d:\Downloads\[SEA] QBR 2025Q2 - 08_Top Pubs.csv
 *
 * Usage: node scripts/query-top-200-publishers.mjs
 */

import BigQueryService from '../lib/services/bigquery.ts'
import fs from 'fs'
import path from 'path'

// BigQuery SQL Query
const query = `
SELECT
  pic AS PIC,
  mid AS MID,
  medianame AS Media,
  SUM(CAST(rev AS FLOAT64)) AS total_revenue,

  -- Web Products (no prefix)
  SUM(CASE WHEN LOWER(product) = 'adrecover' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdRecover,
  SUM(CASE WHEN LOWER(product) = 'adrefresh' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdRefresh,
  SUM(CASE WHEN LOWER(product) = 'pnp' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS PnP,
  SUM(CASE WHEN LOWER(product) = 'offerwall' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Offerwall,
  SUM(CASE WHEN LOWER(product) = 'wipead' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS WipeAd,
  SUM(CASE WHEN LOWER(product) = 'overlay' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Overlay,
  SUM(CASE WHEN LOWER(product) = 'flexiblesticky' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS FlexibleSticky,
  SUM(CASE WHEN LOWER(product) = 'video' OR LOWER(product) LIKE '%video%' OR LOWER(product) = 'mixed_videosticky_wipead' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Video,

  -- Interstitial: includes both web ('interstitial') and app ('app_interstitial')
  SUM(CASE WHEN LOWER(product) = 'interstitial' OR LOWER(product) = 'app_interstitial' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Interstitial,

  -- App Products (with app_ prefix)
  SUM(CASE WHEN LOWER(product) = 'app_appopen' OR LOWER(product) = 'appopen' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AppOpen,
  SUM(CASE WHEN LOWER(product) = 'app_reward' OR LOWER(product) = 'appreward' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Reward,

  -- AdSense Solution
  SUM(CASE WHEN LOWER(product) = 'as' OR LOWER(product) = 'adsense_solution' OR LOWER(product) = 'adsense' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdsenseSolution

FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND DATE < CURRENT_DATE()
GROUP BY pic, mid, medianame
ORDER BY total_revenue DESC
LIMIT 200
`

/**
 * Format number as currency string (e.g., 77382.20 -> "$77,382.20")
 */
function formatCurrency(value) {
  if (value === null || value === undefined || value === 0) {
    return ' $ -   '
  }
  const num = parseFloat(value)
  if (isNaN(num) || num === 0) {
    return ' $ -   '
  }
  // Format: $77,382.20 (with fixed width for alignment)
  const formatted = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return formatted.padStart(10)
}

/**
 * Convert query results to CSV format matching the original file
 */
function toCSV(rows) {
  if (!rows || rows.length === 0) {
    return ''
  }

  // Header matching original CSV format
  const header = [
    'PIC',
    'MID',
    'Media',
    'Market Share (%)',
    'Rev (last 30 days)',
    'AdRecover',
    'AdRefresh',
    'PnP',
    'Offerwall',
    'Wipe Ad',
    'Overlay',
    'Flexible Sticky',
    'Video',
    'Interstitial',
    'APP OPEN',
    'Reward',
    'Adsense Solution'
  ]

  // Calculate total revenue for market share
  const totalRevenue = rows.reduce((sum, row) => sum + (row.total_revenue || 0), 0)

  // Convert each row
  const csvRows = rows.map((row, index) => {
    const marketShare = totalRevenue > 0
      ? ((row.total_revenue / totalRevenue) * 100).toFixed(2) + '%'
      : '0%'

    // Note: CSV has both Web+App combined section
    // For simplicity, we'll output Interstitial_WEB in Interstitial column
    // and Interstitial_APP in a separate position
    return [
      row.PIC || '',
      row.MID || '',
      row.Media || '',
      marketShare,
      formatCurrency(row.total_revenue),
      formatCurrency(row.AdRecover),
      formatCurrency(row.AdRefresh),
      formatCurrency(row.PnP),
      formatCurrency(row.Offerwall),
      formatCurrency(row.WipeAd),
      formatCurrency(row.Overlay),
      formatCurrency(row.FlexibleSticky),
      formatCurrency(row.Video),
      formatCurrency(row.Interstitial),
      formatCurrency(row.AppOpen),
      formatCurrency(row.Reward),
      formatCurrency(row.AdsenseSolution)
    ].join(',')
  })

  // Add row numbers at the beginning
  const numberedRows = csvRows.map((row, i) => `${i + 1}${row}`)

  return [header.join(','), ...numberedRows].join('\n')
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Fetching top 200 publishers from BigQuery...')
    console.log('📅 Date Range: Last 30 days')
    console.log('')

    const rows = await BigQueryService.executeQuery(query)

    console.log(`✅ Fetched ${rows.length} publishers`)
    console.log('')

    if (rows.length === 0) {
      console.log('⚠️  No data found')
      return
    }

    // Convert to CSV
    const csv = toCSV(rows)

    // Write to file
    const outputFile = path.join(process.cwd(), 'SEA_Top_200_Pubs.csv')
    fs.writeFileSync(outputFile, csv, 'utf-8')

    console.log(`✅ CSV exported to: ${outputFile}`)
    console.log('')
    console.log('📊 Top 10 Publishers:')
    console.log('')

    // Display top 10
    rows.slice(0, 10).forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.Media}`)
      console.log(`     PIC: ${row.PIC} | MID: ${row.MID}`)
      console.log(`     Revenue: ${formatCurrency(row.total_revenue)}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('BigQuery')) {
      console.error('')
      console.error('💡 Tips:')
      console.error('  - Check GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS_BASE64 env var')
      console.error('  - Verify BigQuery table name is correct')
      console.error('  - Check network connection')
    }
    process.exit(1)
  }
}

// Run the script
main()
