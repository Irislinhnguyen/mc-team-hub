/**
 * Setup Test Data for Monthly Challenge E2E Tests
 *
 * This script creates:
 * 1. Test users (admin and regular user)
 * 2. Sample challenges with all question types
 * 3. Team assignments for testing grading workflows
 *
 * Usage: node scripts/setup-challenges-tests.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'

// Get project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read environment variables from .env.local
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
    console.warn('Could not load .env.local, using process.env')
    return process.env
  }
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase URL and Service Role Key are required')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Hash password using bcrypt (same as production)
async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

// Test data
const testUsers = [
  {
    email: 'admin@geniee.co.jp',
    password: 'admin123',
    name: 'Test Admin',
    role: 'admin',
    auth_method: 'password',
  },
  {
    email: 'testuser@geniee.co.jp',
    password: 'test123',
    name: 'Test User',
    role: 'user',
    auth_method: 'password',
  },
  {
    email: 'leader@geniee.co.jp',
    password: 'leader123',
    name: 'Test Leader',
    role: 'leader',
    auth_method: 'password',
  },
]

const testChallenges = [
  {
    name: 'E2E Test Challenge - All Question Types',
    description: 'A test challenge with essay, cloze, and drag-drop questions for E2E testing.',
    open_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday (already open)
    close_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    duration_minutes: 60,
    max_attempts: 3,
    status: 'open',
  },
  {
    name: 'Future Challenge - Not Yet Open',
    description: 'A challenge that opens in the future for testing edge cases.',
    open_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    close_date: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days from now
    duration_minutes: 30,
    max_attempts: 1,
    status: 'scheduled',
  },
]

const testQuestions = {
  // Essay question
  essay: {
    question_type: 'essay',
    question_text: 'What is your understanding of test-driven development? Explain its benefits and potential drawbacks.',
    options: null,
    correct_answer: null,
    points: 10,
    display_order: 1,
  },
  // Cloze question (fill in the blanks)
  cloze: {
    question_type: 'cloze',
    question_text: 'The capital of France is {1}, and the capital of Japan is {2}.',
    options: {
      gaps: [
        {
          id: 'gap-1',
          choices: ['Paris', 'London', 'Berlin', 'Madrid'],
          correct_index: 0, // Paris
        },
        {
          id: 'gap-2',
          choices: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
          correct_index: 2, // Tokyo
        },
      ],
    },
    correct_answer: null,
    points: 5,
    display_order: 2,
  },
  // Drag-drop question
  drag_drop: {
    question_type: 'drag_drop',
    question_text: 'Match the following countries to their correct continents.',
    options: {
      items: [
        { id: 'item-1', content: 'Japan' },
        { id: 'item-2', content: 'France' },
        { id: 'item-3', content: 'Brazil' },
        { id: 'item-4', content: 'Egypt' },
      ],
      dropZones: [
        {
          id: 'zone-asia',
          label: 'Asia',
          correct_item_ids: ['item-1'],
        },
        {
          id: 'zone-europe',
          label: 'Europe',
          correct_item_ids: ['item-2'],
        },
        {
          id: 'zone-south-america',
          label: 'South America',
          correct_item_ids: ['item-3'],
        },
        {
          id: 'zone-africa',
          label: 'Africa',
          correct_item_ids: ['item-4'],
        },
      ],
    },
    correct_answer: null,
    points: 8,
    display_order: 3,
  },
}

// =====================================================
// SETUP FUNCTIONS
// =====================================================

async function setupTestUsers() {
  console.log('\n📝 Setting up test users...')

  const results = []

  for (const user of testUsers) {
    const passwordHash = await hashPassword(user.password)

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          email: user.email,
          password_hash: passwordHash,
          name: user.name,
          role: user.role,
          auth_method: user.auth_method,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      )
      .select()

    if (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message)
      results.push({ user: user.email, status: 'failed', error: error.message })
    } else {
      console.log(`✅ Created/updated user: ${user.email} (${user.role})`)
      results.push({ user: user.email, status: 'success', data: data[0] })
    }
  }

  return results
}

async function setupTestChallenges(adminUserId) {
  console.log('\n📝 Setting up test challenges...')

  const results = []

  // First, check if challenges already exist
  const { data: existingChallenges } = await supabase
    .from('challenges')
    .select('name')
    .in('name', testChallenges.map((c) => c.name))

  const existingNames = new Set(existingChallenges?.map((c) => c.name) || [])

  for (const challenge of testChallenges) {
    if (existingNames.has(challenge.name)) {
      console.log(`⏭️  Challenge already exists: ${challenge.name}`)
      // Get the existing challenge data
      const { data: existing } = await supabase
        .from('challenges')
        .select('*')
        .eq('name', challenge.name)
        .single()

      results.push({ challenge: challenge.name, status: 'exists', data: existing })
      continue
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        ...challenge,
        created_by: adminUserId,
        updated_by: adminUserId,
      })
      .select()

    if (error) {
      console.error(`❌ Error creating challenge "${challenge.name}":`, error.message)
      results.push({ challenge: challenge.name, status: 'failed', error: error.message })
    } else {
      const challengeData = data[0]
      console.log(`✅ Created challenge: ${challengeData.name} (${challengeData.status})`)
      results.push({ challenge: challenge.name, status: 'success', data: challengeData })
    }
  }

  return results
}

async function setupTestQuestions(challenges) {
  console.log('\n📝 Setting up test questions...')

  // Find the main test challenge
  const mainChallenge = challenges.find((c) => c.challenge === 'E2E Test Challenge - All Question Types')

  if (!mainChallenge || !mainChallenge.data) {
    console.warn('⚠️  Main challenge not found, skipping question setup')
    return []
  }

  const challengeId = mainChallenge.data.id
  const questions = [testQuestions.essay, testQuestions.cloze, testQuestions.drag_drop]
  const results = []

  // Delete existing questions for this challenge (to avoid duplicates)
  await supabase.from('challenge_questions').delete().eq('challenge_id', challengeId)

  for (const question of questions) {
    const { data, error } = await supabase
      .from('challenge_questions')
      .insert({
        challenge_id: challengeId,
        ...question,
      })
      .select()

    if (error) {
      console.error(
        `❌ Error creating ${question.question_type} question:`,
        error.message
      )
      results.push({ type: question.question_type, status: 'failed', error: error.message })
    } else {
      console.log(`✅ Created ${question.question_type} question`)
      results.push({ type: question.question_type, status: 'success', data: data[0] })
    }
  }

  return results
}

async function setupTeamAssignments(users, adminUserId) {
  console.log('\n📝 Setting up team assignments...')

  // Create a test team
  const teamId = 'test-team-a'

  // Assign testuser to the team (member)
  const testUser = users.find((u) => u.user === 'testuser@geniee.co.jp')
  if (testUser && testUser.data) {
    const { error } = await supabase.from('user_team_assignments').upsert(
      {
        user_id: testUser.data.id,
        team_id: teamId,
        role: 'member',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,team_id',
        ignoreDuplicates: false,
      }
    )

    if (error) {
      console.error('❌ Error creating team assignment for testuser:', error.message)
    } else {
      console.log(`✅ Assigned testuser to team ${teamId} (member)`)
    }
  }

  // Assign leader to the team (leader)
  const leaderUser = users.find((u) => u.user === 'leader@geniee.co.jp')
  if (leaderUser && leaderUser.data) {
    const { error } = await supabase.from('user_team_assignments').upsert(
      {
        user_id: leaderUser.data.id,
        team_id: teamId,
        role: 'leader',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,team_id',
        ignoreDuplicates: false,
      }
    )

    if (error) {
      console.error('❌ Error creating team assignment for leader:', error.message)
    } else {
      console.log(`✅ Assigned leader to team ${teamId} (leader)`)
    }
  }

  console.log(`\n📊 Team ${teamId} structure:`)
  console.log(`   - leader@geniee.co.jp (leader)`)
  console.log(`   - testuser@geniee.co.jp (member)`)
}

// =====================================================
// MAIN SETUP
// =====================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   Monthly Challenge E2E Test Data Setup                     ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  try {
    // 1. Setup test users
    const userResults = await setupTestUsers()

    // Get admin user ID
    const adminUser = userResults.find((u) => u.user === 'admin@geniee.co.jp')
    if (!adminUser || !adminUser.data) {
      throw new Error('Failed to create/get admin user')
    }
    const adminUserId = adminUser.data.id

    // 2. Setup test challenges
    const challengeResults = await setupTestChallenges(adminUserId)

    // 3. Setup test questions
    await setupTestQuestions(challengeResults)

    // 4. Setup team assignments
    await setupTeamAssignments(userResults, adminUserId)

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗')
    console.log('║   ✅ Setup Complete!                                         ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log('\n📋 Test Credentials:')
    console.log('   Admin:    admin@geniee.co.jp / admin123')
    console.log('   User:     testuser@geniee.co.jp / test123')
    console.log('   Leader:   leader@geniee.co.jp / leader123')
    console.log('\n💡 You can now run the E2E tests:')
    console.log('   npm run test:e2e tests/challenges.spec.ts')
    console.log('')
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the setup
main()
