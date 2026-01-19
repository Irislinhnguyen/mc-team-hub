/**
 * Debug script to check Query Lab conversation for linhnt@geniee.co.jp
 * Run with: npx tsx scripts/check-query-lab-conversation.ts
 */

// MUST load dotenv before any other imports
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'

async function checkConversation() {
  // Create admin client directly without relying on config.ts
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET')
    return
  }

  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const email = 'linhnt@geniee.co.jp'

  console.log(`\n=== Checking Query Lab conversation for ${email} ===\n`)

  // 1. Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single()

  if (userError || !user) {
    console.error('User not found:', userError)
    return
  }

  console.log(`User found: ${user.id} (${user.email})`)

  // Also check in query_lab_sessions directly to be sure
  const { data: allSessions, error: allSessionsError } = await supabase
    .from('query_lab_sessions')
    .select('*')
    .eq('user_id', user.id)

  console.log(`\nAll sessions (including archived):`, allSessions?.length || 0)
  if (allSessionsError) console.log('Error:', allSessionsError)

  // Check messages table directly
  const { data: allMessages, error: allMessagesError } = await supabase
    .from('query_lab_messages')
    .select('*, sessions:user_id')  // Try to get session info
    .limit(50)

  console.log(`\nAll recent messages in system:`, allMessages?.length || 0)

  // Get all tables in the database
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables')  // This might not exist, try alternative

  console.log(`\nChecking database structure...`)

  // 2. Get most recent session
  const { data: sessions, error: sessionsError } = await supabase
    .from('query_lab_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(5)

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError)
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found for this user')
    return
  }

  console.log(`\nFound ${sessions.length} session(s)`)

  // Display all sessions
  sessions.forEach((session, idx) => {
    console.log(`\n--- Session ${idx + 1} ---`)
    console.log(`ID: ${session.id}`)
    console.log(`Title: ${session.title}`)
    console.log(`Status: ${session.status}`)
    console.log(`Message Count: ${session.message_count}`)
    console.log(`Created: ${session.created_at}`)
    console.log(`Last Message: ${session.last_message_at}`)
    console.log(`Updated: ${session.updated_at}`)
    console.log(`Metadata:`, JSON.stringify(session.metadata, null, 2))
  })

  // 3. Get messages for the most recent session
  const latestSession = sessions[0]
  console.log(`\n\n=== Messages for latest session: ${latestSession.title} ===`)

  const { data: messages, error: messagesError } = await supabase
    .from('query_lab_messages')
    .select('*')
    .eq('session_id', latestSession.id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    return
  }

  if (!messages || messages.length === 0) {
    console.log('No messages found in this session')
    return
  }

  console.log(`Found ${messages.length} message(s)\n`)

  // Display each message
  messages.forEach((msg, idx) => {
    console.log(`--- Message ${idx + 1} ---`)
    console.log(`ID: ${msg.id}`)
    console.log(`Role: ${msg.role}`)
    console.log(`Type: ${msg.message_type}`)
    console.log(`Created: ${msg.created_at}`)
    console.log(`Content: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}`)
    if (msg.sql) console.log(`SQL: ${msg.sql.substring(0, 100)}...`)
    if (msg.row_count !== null) console.log(`Row Count: ${msg.row_count}`)
    if (msg.confidence !== null) console.log(`Confidence: ${msg.confidence}`)
    if (msg.warnings) console.log(`Warnings:`, JSON.stringify(msg.warnings))
    if (msg.retry_info) console.log(`Retry Info:`, JSON.stringify(msg.retry_info))
    console.log('')
  })

  // 4. Check for any anomalies
  console.log('\n=== Analysis ===')
  const expectedCount = latestSession.message_count
  const actualCount = messages.length

  if (expectedCount !== actualCount) {
    console.log(`⚠️ MISMATCH: Session.message_count (${expectedCount}) != actual messages (${actualCount})`)
  } else {
    console.log(`✓ Message count matches: ${actualCount}`)
  }

  const lastMessage = messages[messages.length - 1]
  const lastMessageDate = new Date(lastMessage.created_at)
  const sessionLastMessageDate = latestSession.last_message_at ? new Date(latestSession.last_message_at) : null

  if (sessionLastMessageDate && Math.abs(lastMessageDate.getTime() - sessionLastMessageDate.getTime()) > 1000) {
    console.log(`⚠️ MISMATCH: last_message_at timestamp doesn't match last message`)
  } else {
    console.log(`✓ last_message_at timestamp matches`)
  }

  // Check for any error messages
  const errorMessages = messages.filter(m => m.message_type === 'error')
  if (errorMessages.length > 0) {
    console.log(`⚠️ Found ${errorMessages.length} error message(s)`)
  } else {
    console.log(`✓ No error messages`)
  }

  // Check last message role
  if (lastMessage.role === 'user') {
    console.log(`⚠️ Last message is from user - AI may not have responded yet (stuck!)`)
  } else {
    console.log(`✓ Last message is from ${lastMessage.role}`)
  }
}

checkConversation().catch(console.error)
