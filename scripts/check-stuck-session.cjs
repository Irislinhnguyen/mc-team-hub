/**
 * Debug script to check the stuck Query Lab session
 * Run with: node scripts/check-stuck-session.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function checkStuckSession() {
  const sessionId = 'f872081d-9b29-44e2-a0fd-c7066d1898a7'

  console.log('\n=== Checking stuck session ===\n')

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('query_lab_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError) {
    console.error('Session error:', sessionError)
    return
  }

  console.log('Session Details:')
  console.log('ID:', session.id)
  console.log('Title:', session.title)
  console.log('User ID:', session.user_id)
  console.log('User ID type:', typeof session.user_id)
  console.log('Status:', session.status)
  console.log('Message Count:', session.message_count)
  console.log('Created:', session.created_at)
  console.log('Last Message:', session.last_message_at)
  console.log('Metadata:', JSON.stringify(session.metadata, null, 2))

  // Get messages
  console.log('\n=== Messages ===\n')
  const { data: messages, error: messagesError } = await supabase
    .from('query_lab_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Messages error:', messagesError)
    return
  }

  console.log(`Found ${messages.length} messages\n`)

  messages.forEach((msg, idx) => {
    console.log(`--- Message ${idx + 1} ---`)
    console.log('ID:', msg.id)
    console.log('Role:', msg.role)
    console.log('Type:', msg.message_type)
    console.log('Created:', msg.created_at)

    if (msg.content) {
      const preview = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
      console.log('Content:', preview)
    }

    if (msg.sql) {
      const sqlPreview = msg.sql.length > 300 ? msg.sql.substring(0, 300) + '...' : msg.sql
      console.log('SQL:', sqlPreview)
    }

    if (msg.warnings) {
      console.log('Warnings:', JSON.stringify(msg.warnings))
    }

    if (msg.retry_info) {
      console.log('Retry Info:', JSON.stringify(msg.retry_info))
    }

    console.log('Confidence:', msg.confidence)
    console.log('Row Count:', msg.row_count)
    console.log('')
  })

  // Check what's "stuck"
  const lastMessage = messages[messages.length - 1]
  if (lastMessage) {
    console.log('=== Analysis ===')
    console.log('Last message role:', lastMessage.role)
    console.log('Last message type:', lastMessage.message_type)

    if (lastMessage.role === 'assistant' && lastMessage.message_type === 'plan') {
      console.log('⚠️ Last message is a PLAN from assistant - user may not have confirmed yet')
    }
    if (lastMessage.role === 'user') {
      console.log('⚠️ Last message is from user - AI did not respond yet!')
    }
  }
}

checkStuckSession().catch(console.error)
