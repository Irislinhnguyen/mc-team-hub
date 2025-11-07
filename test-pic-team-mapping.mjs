import { BigQuery } from '@google-cloud/bigquery'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf-8')
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
})

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPicsInBigQuery() {
  console.log('\n=== CHECKING PICs IN BIGQUERY ===\n')

  const query = `
    SELECT DISTINCT pic
    FROM \`gcpp-check.GI_publisher.final_sales_monthly\`
    WHERE pic IS NOT NULL
    ORDER BY pic
  `

  const [rows] = await bigquery.query({ query })
  console.log('PICs found in BigQuery (final_sales_monthly):')
  console.log(rows.map(row => row.pic))
  console.log(`\nTotal unique PICs: ${rows.length}`)

  return rows.map(row => row.pic)
}

async function checkTeamsInSupabase() {
  console.log('\n=== CHECKING TEAMS IN SUPABASE ===\n')

  const { data: teams, error } = await supabase
    .from('teams')
    .select('team_id, team_name, pics')
    .order('team_id')

  if (error) {
    console.error('Error fetching teams:', error)
    return []
  }

  console.log('Teams and their assigned PICs:')
  teams.forEach(team => {
    console.log(`\n${team.team_id} (${team.team_name}):`)
    console.log(`  PICs: ${team.pics?.join(', ') || 'None'}`)
  })

  // Create PIC-to-Team mapping
  const picToTeamMap = new Map()
  teams.forEach(team => {
    if (team.pics && Array.isArray(team.pics)) {
      team.pics.forEach(pic => {
        picToTeamMap.set(pic, team.team_id)
      })
    }
  })

  return { teams, picToTeamMap }
}

async function findUnmappedPics(bigqueryPics, picToTeamMap) {
  console.log('\n=== CHECKING FOR UNMAPPED PICs ===\n')

  const unmappedPics = bigqueryPics.filter(pic => !picToTeamMap.has(pic))

  if (unmappedPics.length > 0) {
    console.log('⚠️  WARNING: These PICs exist in BigQuery but are NOT assigned to any team in Supabase:')
    unmappedPics.forEach(pic => console.log(`  - ${pic}`))
  } else {
    console.log('✅ All PICs in BigQuery are mapped to teams in Supabase')
  }

  return unmappedPics
}

async function checkRevenueByPic() {
  console.log('\n=== CHECKING REVENUE BY PIC (Sample) ===\n')

  const query = `
    SELECT
      pic,
      COUNT(DISTINCT year || '-' || month) as month_count,
      SUM(total_revenue) as total_revenue,
      SUM(total_profit) as total_profit
    FROM \`gcpp-check.GI_publisher.final_sales_monthly\`
    WHERE pic IS NOT NULL
    GROUP BY pic
    ORDER BY total_revenue DESC
    LIMIT 10
  `

  const [rows] = await bigquery.query({ query })
  console.log('Top 10 PICs by revenue:')
  console.table(rows)
}

async function main() {
  try {
    console.log('Starting PIC-Team mapping diagnostic...\n')

    // Check BigQuery
    const bigqueryPics = await checkPicsInBigQuery()

    // Check Supabase
    const { teams, picToTeamMap } = await checkTeamsInSupabase()

    // Find unmapped PICs
    const unmappedPics = await findUnmappedPics(bigqueryPics, picToTeamMap)

    // Check revenue by PIC
    await checkRevenueByPic()

    // Summary
    console.log('\n=== SUMMARY ===\n')
    console.log(`Total PICs in BigQuery: ${bigqueryPics.length}`)
    console.log(`Total teams in Supabase: ${teams.length}`)
    console.log(`Total PICs mapped to teams: ${picToTeamMap.size}`)
    console.log(`Unmapped PICs: ${unmappedPics.length}`)

    if (unmappedPics.length > 0) {
      console.log('\n⚠️  ACTION REQUIRED: Add these PICs to team assignments in Supabase')
      console.log('   Go to: /analytics/team-setup')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

main()
