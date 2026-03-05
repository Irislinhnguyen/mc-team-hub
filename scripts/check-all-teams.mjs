/**
 * Check all teams in database
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

console.log('📋 All teams in database:')
console.log('-'.repeat(80))

const { data: teams } = await supabase
  .from('team_pic_mappings')
  .select('team_id, pic_name')
  .order('team_id, pic_name')

// Group by team
const byTeam = {}
teams.forEach(t => {
  if (!byTeam[t.team_id]) byTeam[t.team_id] = []
  byTeam[t.team_id].push(t.pic_name)
})

Object.entries(byTeam).forEach(([teamId, pics]) => {
  console.log(`${teamId}: ${pics.length} PICs`)
  console.log(`  ${pics.join(', ')}`)
  console.log()
})
