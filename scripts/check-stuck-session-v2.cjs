/**
 * Check the latest state of the stuck session
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function check() {
  const sessionId = 'f872081d-9b29-44e2-a0fd-c7066d1898a7'

  console.log('\n=== Latest messages in session ===\n')

  const { data: messages } = await supabase
    .from('query_lab_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  console.log(`Total messages: ${messages.length}\n`)

  // Show last 5 messages
  const last5 = messages.slice(-5)
  last5.forEach((msg, idx) => {
    const num = messages.length - 5 + idx + 1
    console.log(`--- Message ${num} ---`)
    console.log(`Role: ${msg.role}`)
    console.log(`Type: ${msg.message_type}`)
    console.log(`Created: ${msg.created_at}`)
    if (msg.content) {
      const preview = msg.content.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content
      console.log(`Content: ${preview}`)
    }
    if (msg.sql) {
      console.log(`SQL: ${msg.sql.substring(0, 200)}...`)
    }
    console.log('')
  })

  // Check if there's any error message
  const hasError = messages.some(m => m.message_type === 'error' || m.message_type === 'clarification')
  console.log(`Has error/clarification message: ${hasError}`)
}

check().catch(console.error)
