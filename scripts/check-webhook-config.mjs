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

async function checkWebhookConfig() {
  console.log('🔍 Webhook Configuration Check:\n')
  
  const { data: sheets, error } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('sync_status', 'active')

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (!sheets || sheets.length === 0) {
    console.log('❌ No active quarterly sheets found!')
    return
  }

  console.log(`Found ${sheets.length} active quarterly sheets:\n`)

  sheets.forEach(sheet => {
    console.log(`📋 ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
    console.log(`   Webhook Token: ${sheet.webhook_token ? '✅ Set' : '❌ NOT SET'}`)
    console.log(`   Token Preview: ${sheet.webhook_token ? sheet.webhook_token.substring(0, 10) + '...' : 'N/A'}`)
    console.log(`   Spreadsheet ID: ${sheet.spreadsheet_id}`)
    console.log(`   Last Sync: ${sheet.last_sync_at ? new Date(sheet.last_sync_at).toLocaleString() : 'Never'}`)
    console.log(`   Last Status: ${sheet.last_sync_status || 'Never synced'}`)
    
    if (sheet.last_sync_error) {
      console.log(`   Last Error: ${sheet.last_sync_error.substring(0, 100)}...`)
    }
    
    console.log('')
  })
}

checkWebhookConfig().catch(console.error)
