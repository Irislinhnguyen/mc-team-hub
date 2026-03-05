/**
 * Debug: Check APP team publishers over time
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

console.log('📋 Fetching APP team PICs...')

const { data: picMappings } = await supabase
  .from('team_pic_mappings')
  .select('team_id, pic_name')
  .like('team_id', 'APP%')

const appPics = picMappings.map(m => m.pic_name)
console.log(`APP PICs (${appPics.length}): ${appPics.join(', ')}`)
console.log()

const { default: BigQueryService } = await import('../lib/services/bigquery.js')

const picFilter = appPics.map(pic => `'${pic}'`).join(', ')

// Check publishers per year
const query = `
  SELECT
    year,
    COUNT(DISTINCT pid) as num_pubs
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE pic IN (${picFilter})
    AND pid IS NOT NULL
  GROUP BY year
  ORDER BY year DESC
`

console.log('📊 APP team publishers by year:')
console.log('-'.repeat(80))
const rows = await BigQueryService.executeQuery(query)
rows.forEach(row => {
  console.log(`${row.year}: ${row.num_pubs} publishers`)
})

console.log()
console.log('-'.repeat(80))

// Check before vs after June 2025
const query2 = `
  SELECT
    'Before Jun 2025' as period,
    COUNT(DISTINCT pid) as num_pubs
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE pic IN (${picFilter})
    AND (
      (year < 2025) OR
      (year = 2025 AND month < 6)
    )
  UNION ALL
  SELECT
    'Jun 2025 onwards' as period,
    COUNT(DISTINCT pid) as num_pubs
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE pic IN (${picFilter})
    AND (
      (year = 2025 AND month >= 6) OR
      (year >= 2026)
    )
`

console.log('📊 Publishers before vs after June 2025:')
console.log('-'.repeat(80))
const rows2 = await BigQueryService.executeQuery(query2)
rows2.forEach(row => {
  console.log(`${row.period}: ${row.num_pubs} publishers`)
})
