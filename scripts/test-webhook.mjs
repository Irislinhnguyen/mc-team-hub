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

async function testWebhook() {
  console.log('🧪 Testing Webhook Endpoint\n')

  // Get webhook token
  const { data: sheet, error: sheetError } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('group', 'sales')
    .eq('sync_status', 'active')
    .single()

  if (sheetError || !sheet) {
    console.error('❌ Error fetching sheet:', sheetError?.message)
    return
  }

  console.log(`Testing webhook for: ${sheet.sheet_name}`)
  console.log(`Webhook Token: ${sheet.webhook_token?.substring(0, 10)}...`)
  console.log(`Spreadsheet ID: ${sheet.spreadsheet_id}`)
  console.log('')

  const webhookUrl = 'http://localhost:3000/api/pipelines/webhook/sheet-changed'

  const payload = {
    token: sheet.webhook_token,
    spreadsheet_id: sheet.spreadsheet_id,
    sheet_name: sheet.sheet_name,
    trigger_type: 'manual',
    timestamp: new Date().toISOString(),
    user_email: 'test@example.com'
  }

  console.log('📡 Sending test webhook to:', webhookUrl)
  console.log('Payload:', JSON.stringify(payload, null, 2))
  console.log('')

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log(`✅ Webhook Response (${response.status}):`)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Webhook Error:', error.message)
    console.log('   Make sure the development server is running on port 3000')
  }
}

testWebhook().catch(console.error)
