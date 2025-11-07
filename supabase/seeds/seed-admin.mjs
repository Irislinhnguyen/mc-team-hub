#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local file
dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedAdminUser() {
  console.log('🌱 Seeding admin user...\n')

  // Get admin credentials from environment or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@geniee.co.jp'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'System Administrator'

  if (adminPassword === 'admin123') {
    console.warn('⚠️  WARNING: Using default password "admin123"')
    console.warn('⚠️  Please set ADMIN_PASSWORD in .env.local for production!\n')
  }

  try {
    // Hash password with bcrypt
    console.log('🔐 Hashing password...')
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', adminEmail)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected
      throw checkError
    }

    if (existingUser) {
      // Update existing admin user
      console.log(`📝 Updating existing admin user: ${adminEmail}`)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          name: adminName,
          role: 'admin',
          auth_method: 'password',
          updated_at: new Date().toISOString(),
        })
        .eq('email', adminEmail)

      if (updateError) throw updateError
      console.log('✅ Admin user updated successfully!')
    } else {
      // Create new admin user
      console.log(`➕ Creating new admin user: ${adminEmail}`)
      const { error: insertError } = await supabase.from('users').insert({
        email: adminEmail,
        password_hash: passwordHash,
        name: adminName,
        role: 'admin',
        auth_method: 'password',
      })

      if (insertError) throw insertError
      console.log('✅ Admin user created successfully!')
    }

    console.log('\n📋 Admin credentials:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log('\n🎉 Seeding completed!\n')
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message)
    process.exit(1)
  }
}

seedAdminUser()
