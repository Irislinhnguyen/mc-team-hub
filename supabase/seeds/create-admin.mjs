#!/usr/bin/env node
/**
 * Quick script to create admin user in database
 * Run this once to set up the admin user for testing
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load env vars
const envPath = join(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
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
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminUser() {
  const email = 'admin@geniee.co.jp'
  const password = 'admin123'

  console.log('🔐 Creating admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}\n`)

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single()

  if (existingUser) {
    console.log('📝 Admin user already exists, updating password...')
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        name: 'System Administrator',
        role: 'admin',
        auth_method: 'password',
      })
      .eq('email', email)

    if (error) {
      console.error('❌ Error updating user:', error)
      process.exit(1)
    }
    console.log('✅ Admin user updated successfully!')
  } else {
    console.log('➕ Creating new admin user...')
    const { error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name: 'System Administrator',
        role: 'admin',
        auth_method: 'password',
      })

    if (error) {
      console.error('❌ Error creating user:', error)
      process.exit(1)
    }
    console.log('✅ Admin user created successfully!')
  }

  console.log('\n🎉 Setup complete!')
  console.log('\nYou can now log in with:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}\n`)
}

createAdminUser().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
