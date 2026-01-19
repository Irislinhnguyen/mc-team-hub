/**
 * Get FULL plan content to see why SQL didn't execute
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function checkFullPlan() {
  const messageId = 'cc06db3a-7709-442d-ab61-35a019d8e968'

  console.log('\n=== Getting FULL plan message ===\n')

  const { data: msg, error } = await supabase
    .from('query_lab_messages')
    .select('*')
    .eq('id', messageId)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Message ID:', msg.id)
  console.log('Role:', msg.role)
  console.log('Type:', msg.message_type)
  console.log('Content Length:', msg.content?.length)
  console.log('\n=== FULL CONTENT ===')
  console.log(msg.content)
  console.log('\n=== END CONTENT ===')

  console.log('\nSQL:', msg.sql)
  console.log('Warnings:', msg.warnings)
  console.log('Retry Info:', msg.retry_info)
}

checkFullPlan().catch(console.error)
