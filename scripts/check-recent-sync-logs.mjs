import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: logs, error } = await supabase
    .from('pipeline_sync_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10)

  console.log('📋 Recent Sync Logs (all users):\n')

  if (!logs || logs.length === 0) {
    console.log('No logs found')
    return
  }

  logs.forEach((log, i) => {
    const date = new Date(log.timestamp || Date.now())
    console.log(`${i + 1}. ${date.toLocaleString()}`)
    console.log(`   User: ${log.user_email || 'Unknown'}`)
    console.log(`   Status: ${log.status}`)
    console.log(`   Sheet: ${log.target_sheet}`)
    console.log(`   Created: ${log.rows_created}, Updated: ${log.rows_updated}, Deleted: ${log.rows_deleted}`)
    console.log('')
  })
}

main().catch(console.error)
