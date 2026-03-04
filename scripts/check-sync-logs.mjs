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

async function checkRecentSyncLogs() {
  console.log('🔍 Recent Sync Logs (last 15 entries):\n')
  
  const { data, error } = await supabase
    .from('pipeline_sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(15)

  if (error) {
    console.error('Error fetching sync logs:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('❌ No sync logs found!')
    return
  }

  console.log(`Total logs found: ${data.length}\n`)

  data.forEach((log, index) => {
    const date = new Date(log.synced_at).toLocaleString()
    const statusEmoji = log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '⚠️'

    console.log(`${index + 1}. ${statusEmoji} ${date}`)
    console.log(`   Status: ${log.status}`)
    console.log(`   Type: ${log.sync_type}`)
    console.log(`   Direction: ${log.sync_direction}`)
    console.log(`   Sheet: ${log.target_sheet}`)
    console.log(`   Results: ${log.rows_created} created, ${log.rows_updated} updated, ${log.rows_deleted} deleted`)

    if (log.error_message) {
      console.log(`   Error: ${log.error_message.substring(0, 100)}...`)
    }

    if (log.processing_duration_ms) {
      console.log(`   Duration: ${(log.processing_duration_ms / 1000).toFixed(1)}s`)
    }

    console.log('')
  })
}

checkRecentSyncLogs().catch(console.error)
