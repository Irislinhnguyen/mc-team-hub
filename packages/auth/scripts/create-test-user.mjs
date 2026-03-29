#!/usr/bin/env node
/**
 * Create test admin user with known credentials
 * Usage: node packages/auth/scripts/create-test-user.mjs
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env from root
const rootEnvPath = join(__dirname, '../../../.env.local')
const envContent = readFileSync(rootEnvPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestUser() {
  const email = 'bible-admin@geniee.co.jp'
  const password = 'test12345'

  console.log('🔐 Creating test admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}\n`)

  // Hash password
  console.log('🔐 Hashing password...')
  const passwordHash = await bcrypt.hash(password, 10)
  console.log('   ✓ Password hashed')

  // Update or create user
  console.log('💾 Saving to database...')
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    // Update
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        name: 'Bible Admin',
        role: 'admin',
        auth_method: 'password',
      })
      .eq('email', email)

    if (error) {
      console.error('❌ Error updating user:', error)
      process.exit(1)
    }
    console.log('✅ User updated successfully!')
  } else {
    // Create
    const { error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name: 'Bible Admin',
        role: 'admin',
        auth_method: 'password',
      })

    if (error) {
      console.error('❌ Error creating user:', error)
      process.exit(1)
    }
    console.log('✅ User created successfully!')
  }

  console.log('\n🎉 Done!')
  console.log('\n📋 Login credentials:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}\n`)
}

createTestUser().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
