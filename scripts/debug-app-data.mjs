/**
 * Debug: Check what APP team data exists in BigQuery
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
console.log(`APP PICs: ${appPics.join(', ')}`)
console.log()

const { default: BigQueryService } = await import('../lib/services/bigquery.js')

const picFilter = appPics.map(pic => `'${pic}'`).join(', ')

// Check what data exists for APP PICs
const query = `
  SELECT
    year,
    month,
    COUNT(DISTINCT pid) as num_pubs,
    COUNT(DISTINCT mid) as num_mids
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
  WHERE pic IN (${picFilter})
  GROUP BY year, month
  ORDER BY year DESC, month DESC
  LIMIT 30
`

console.log('📊 APP team data by month (most recent first):')
console.log('-'.repeat(80))
const rows = await BigQueryService.executeQuery(query)
rows.forEach(row => {
  console.log(`${row.year}-${String(row.month).padStart(2, '0')}: ${row.num_pubs} pubs, ${row.num_mids} mids`)
})
