/**
 * Verify test users can authenticate
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load environment
function loadEnv() {
  const envPath = join(rootDir, '.env.local')
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const env = {}
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
    return env
  } catch (e) {
    return process.env
  }
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testUsers = [
  { email: 'admin@geniee.co.jp', password: 'admin123' },
  { email: 'testuser@geniee.co.jp', password: 'test123' },
  { email: 'leader@geniee.co.jp', password: 'leader123' },
]

console.log('Verifying test users...\n')

for (const user of testUsers) {
  const { data, error } = await supabase
    .from('users')
    .select('email, password_hash, role, auth_method')
    .eq('email', user.email)
    .single()

  if (error || !data) {
    console.log(`❌ ${user.email}: User not found`)
    continue
  }

  if (!data.password_hash) {
    console.log(`❌ ${user.email}: No password hash set`)
    continue
  }

  const isValid = await bcrypt.compare(user.password, data.password_hash)

  if (isValid) {
    console.log(`✅ ${user.email}: Password valid (${data.role})`)
  } else {
    console.log(`❌ ${user.email}: Password INVALID`)
    console.log(`   Hash: ${data.password_hash.substring(0, 20)}...`)
  }
}
