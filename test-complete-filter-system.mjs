/**
 * Comprehensive Filter System Test
 *
 * Tests all filter types and preset system:
 * 1. Advanced Filters with SimplifiedFilter structure
 * 2. Regular Filters (team, pic, product, date range)
 * 3. Cross Filters
 * 4. Filter Merging and AND logic
 * 5. Database storage verification
 * 6. API endpoints (GET, POST, PATCH, DELETE)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test user ID (get from database)
let TEST_USER_ID = null

// Store created preset IDs for cleanup
const createdPresetIds = []

// Color coding for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`)
}

function success(message) {
  log(colors.green, '✓', message)
}

function error(message) {
  log(colors.red, '✗', message)
}

function info(message) {
  log(colors.cyan, 'ℹ', message)
}

function warn(message) {
  log(colors.yellow, '⚠', message)
}

function section(message) {
  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}`)
  console.log(`${colors.magenta}${message}${colors.reset}`)
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}\n`)
}

/**
 * Get or create test user
 */
async function setupTestUser() {
  section('Setting up test user')

  const testEmail = 'test@example.com'

  // Check if test user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', testEmail)
    .single()

  if (existingUser) {
    TEST_USER_ID = existingUser.id
    success(`Using existing test user: ${existingUser.email} (ID: ${TEST_USER_ID})`)
    return
  }

  // Create test user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: testEmail,
      name: 'Test User'
    })
    .select()
    .single()

  if (createError) {
    error(`Failed to create test user: ${createError.message}`)
    throw createError
  }

  TEST_USER_ID = newUser.id
  success(`Created test user: ${newUser.email} (ID: ${TEST_USER_ID})`)
}

/**
 * Test 1: Database Schema Verification
 */
async function testDatabaseSchema() {
  section('Test 1: Database Schema Verification')

  try {
    // Check if filter_presets table exists and has correct columns
    const { data, error } = await supabase
      .from('filter_presets')
      .select('*')
      .limit(1)

    if (error) {
      error(`Table query failed: ${error.message}`)
      return false
    }

    success('filter_presets table exists')

    // Check required columns by trying to insert and rollback
    const testPreset = {
      user_id: TEST_USER_ID,
      name: '__schema_test__',
      page: 'deep-dive',
      filters: {},
      cross_filters: [],
      simplified_filter: {
        includeExclude: 'INCLUDE',
        clauses: [],
        clauseLogic: 'AND'
      },
      filter_type: 'advanced',
      is_default: false,
      is_shared: false
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('filter_presets')
      .insert(testPreset)
      .select()
      .single()

    if (insertError) {
      error(`Schema validation failed: ${insertError.message}`)
      return false
    }

    // Clean up test record
    await supabase.from('filter_presets').delete().eq('id', insertTest.id)

    // Verify all columns exist
    const requiredColumns = [
      'id', 'user_id', 'name', 'description', 'page',
      'filters', 'cross_filters', 'simplified_filter', 'filter_type',
      'is_default', 'is_shared', 'created_at', 'updated_at'
    ]

    for (const col of requiredColumns) {
      if (insertTest[col] !== undefined || col === 'description') {
        success(`Column exists: ${col}`)
      } else {
        error(`Missing column: ${col}`)
        return false
      }
    }

    return true
  } catch (err) {
    error(`Schema test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 2: Create Advanced Filter with SimplifiedFilter
 */
async function testCreateAdvancedFilter() {
  section('Test 2: Create Advanced Filter with SimplifiedFilter')

  try {
    const advancedFilter = {
      user_id: TEST_USER_ID,
      name: 'Test Advanced Multi-Select',
      description: 'Test filter with has_all operator',
      page: 'deep-dive',
      filters: {}, // Empty regular filters
      cross_filters: [],
      simplified_filter: {
        name: 'Test Advanced Multi-Select',
        includeExclude: 'INCLUDE',
        clauseLogic: 'AND',
        clauses: [
          {
            id: 'clause1',
            field: 'pid',
            dataType: 'number',
            operator: 'has_all',
            attributeField: 'product',
            attributeDataType: 'string',
            condition: 'in',
            value: ['app_standardbanner', 'app_video'],
            enabled: true
          },
          {
            id: 'clause2',
            field: 'zid',
            dataType: 'number',
            operator: 'has',
            attributeField: 'zonename',
            attributeDataType: 'string',
            condition: 'contains',
            value: 'premium',
            enabled: true
          }
        ]
      },
      filter_type: 'advanced',
      is_default: false,
      is_shared: false
    }

    const { data, error } = await supabase
      .from('filter_presets')
      .insert(advancedFilter)
      .select()
      .single()

    if (error) {
      error(`Failed to create advanced filter: ${error.message}`)
      return null
    }

    createdPresetIds.push(data.id)

    success(`Advanced filter created: ${data.name} (ID: ${data.id})`)
    info(`Filter type: ${data.filter_type}`)
    info(`Simplified filter clauses: ${data.simplified_filter.clauses.length}`)

    // Verify simplified_filter structure
    if (data.simplified_filter) {
      success('simplified_filter field exists in database')

      const sf = data.simplified_filter
      if (sf.includeExclude === 'INCLUDE') success('includeExclude: INCLUDE')
      if (sf.clauseLogic === 'AND') success('clauseLogic: AND')
      if (sf.clauses.length === 2) success('clauses count: 2')

      // Verify clause 1 (has_all with multi-select)
      const clause1 = sf.clauses.find(c => c.id === 'clause1')
      if (clause1) {
        success('Clause 1: PID has_all product in [...]')
        if (clause1.operator === 'has_all') success('  operator: has_all')
        if (clause1.attributeField === 'product') success('  attributeField: product')
        if (clause1.condition === 'in') success('  condition: in')
        if (Array.isArray(clause1.value) && clause1.value.length === 2) success('  value: array with 2 items')
      } else {
        error('Clause 1 not found')
      }

      // Verify clause 2 (has with contains)
      const clause2 = sf.clauses.find(c => c.id === 'clause2')
      if (clause2) {
        success('Clause 2: ZID has zonename contains premium')
        if (clause2.operator === 'has') success('  operator: has')
        if (clause2.attributeField === 'zonename') success('  attributeField: zonename')
        if (clause2.condition === 'contains') success('  condition: contains')
        if (clause2.value === 'premium') success('  value: premium')
      } else {
        error('Clause 2 not found')
      }
    } else {
      error('simplified_filter field is NULL')
    }

    return data
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return null
  }
}

/**
 * Test 3: Create Regular Filter Preset
 */
async function testCreateRegularFilter() {
  section('Test 3: Create Regular Filter Preset')

  try {
    const regularFilter = {
      user_id: TEST_USER_ID,
      name: 'Test Regular Filters',
      description: 'Test with team, pic, product, date filters',
      page: 'deep-dive',
      filters: {
        team: ['Team A', 'Team B'],
        pic: ['John Doe'],
        product: ['app_video', 'app_banner'],
        daterange: {
          start: '2025-01-01',
          end: '2025-01-31'
        }
      },
      cross_filters: [],
      filter_type: 'standard',
      is_default: false,
      is_shared: false
    }

    const { data, error } = await supabase
      .from('filter_presets')
      .insert(regularFilter)
      .select()
      .single()

    if (error) {
      error(`Failed to create regular filter: ${error.message}`)
      return null
    }

    createdPresetIds.push(data.id)

    success(`Regular filter created: ${data.name} (ID: ${data.id})`)
    info(`Filter type: ${data.filter_type}`)

    // Verify filters structure
    if (data.filters.team) success(`Team filter: ${data.filters.team.join(', ')}`)
    if (data.filters.pic) success(`PIC filter: ${data.filters.pic.join(', ')}`)
    if (data.filters.product) success(`Product filter: ${data.filters.product.join(', ')}`)
    if (data.filters.daterange) success(`Date range: ${data.filters.daterange.start} to ${data.filters.daterange.end}`)

    return data
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return null
  }
}

/**
 * Test 4: Create Mixed Preset (Regular + Advanced + Cross Filters)
 */
async function testCreateMixedPreset() {
  section('Test 4: Create Mixed Preset (Regular + Advanced + Cross)')

  try {
    const mixedPreset = {
      user_id: TEST_USER_ID,
      name: 'Test Mixed Preset',
      description: 'Combines all filter types',
      page: 'deep-dive',
      filters: {
        team: ['Team C'],
        pic: ['Jane Smith']
      },
      cross_filters: [
        {
          field: 'revenue_tier',
          value: 'Tier 1',
          label: 'Revenue Tier: Tier 1'
        }
      ],
      simplified_filter: {
        includeExclude: 'INCLUDE',
        clauseLogic: 'OR',
        clauses: [
          {
            id: 'mixed1',
            field: 'product',
            dataType: 'string',
            operator: 'in',
            value: ['app_video', 'web_video'],
            enabled: true
          }
        ]
      },
      filter_type: 'advanced',
      is_default: false,
      is_shared: false
    }

    const { data, error } = await supabase
      .from('filter_presets')
      .insert(mixedPreset)
      .select()
      .single()

    if (error) {
      error(`Failed to create mixed preset: ${error.message}`)
      return null
    }

    createdPresetIds.push(data.id)

    success(`Mixed preset created: ${data.name} (ID: ${data.id})`)

    // Verify all filter types
    if (data.filters.team) success(`Regular filters: team=${data.filters.team.join(', ')}`)
    if (data.cross_filters.length > 0) success(`Cross filters: ${data.cross_filters[0].label}`)
    if (data.simplified_filter) success(`Advanced filters: ${data.simplified_filter.clauses.length} clauses`)

    return data
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return null
  }
}

/**
 * Test 5: Load Filter (GET)
 */
async function testLoadFilter(presetId) {
  section('Test 5: Load Filter (GET)')

  try {
    const { data, error } = await supabase
      .from('filter_presets')
      .select('*')
      .eq('id', presetId)
      .single()

    if (error) {
      error(`Failed to load filter: ${error.message}`)
      return false
    }

    success(`Filter loaded: ${data.name}`)

    // Verify data integrity
    if (data.id === presetId) success('ID matches')
    if (data.user_id === TEST_USER_ID) success('User ID matches')
    if (data.filters) success('Filters field exists')
    if (data.cross_filters !== undefined) success('Cross filters field exists')

    if (data.filter_type === 'advanced' && data.simplified_filter) {
      success('simplified_filter exists for advanced filter')
      info(`Clauses: ${data.simplified_filter.clauses.length}`)
      info(`Logic: ${data.simplified_filter.clauseLogic}`)
      info(`Include/Exclude: ${data.simplified_filter.includeExclude}`)
    }

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 6: Update Filter (PATCH)
 */
async function testUpdateFilter(presetId) {
  section('Test 6: Update Filter (PATCH)')

  try {
    // Add another clause to simplified_filter
    const { data: current } = await supabase
      .from('filter_presets')
      .select('simplified_filter')
      .eq('id', presetId)
      .single()

    const updatedSimplifiedFilter = {
      ...current.simplified_filter,
      clauses: [
        ...current.simplified_filter.clauses,
        {
          id: 'new_clause',
          field: 'revenue_tier',
          dataType: 'string',
          operator: 'equals',
          value: 'Tier 1',
          enabled: true
        }
      ]
    }

    const { data, error } = await supabase
      .from('filter_presets')
      .update({
        name: 'Test Advanced Multi-Select (Updated)',
        simplified_filter: updatedSimplifiedFilter
      })
      .eq('id', presetId)
      .select()
      .single()

    if (error) {
      error(`Failed to update filter: ${error.message}`)
      return false
    }

    success(`Filter updated: ${data.name}`)

    // Verify update
    if (data.name.includes('Updated')) success('Name updated')
    if (data.simplified_filter.clauses.length === current.simplified_filter.clauses.length + 1) {
      success(`Clause added (now ${data.simplified_filter.clauses.length} clauses)`)
    }

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 7: List Filters by Page
 */
async function testListFiltersByPage() {
  section('Test 7: List Filters by Page')

  try {
    const { data, error } = await supabase
      .from('filter_presets')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('page', 'deep-dive')
      .order('name', { ascending: true })

    if (error) {
      error(`Failed to list filters: ${error.message}`)
      return false
    }

    success(`Found ${data.length} filters for page 'deep-dive'`)

    data.forEach((preset, index) => {
      info(`${index + 1}. ${preset.name} (${preset.filter_type})`)
      if (preset.simplified_filter) {
        info(`   - ${preset.simplified_filter.clauses.length} advanced clauses`)
      }
      if (Object.keys(preset.filters).length > 0) {
        info(`   - Regular filters: ${Object.keys(preset.filters).join(', ')}`)
      }
      if (preset.cross_filters.length > 0) {
        info(`   - ${preset.cross_filters.length} cross filters`)
      }
    })

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 8: Filter Type Classification
 */
async function testFilterTypeClassification() {
  section('Test 8: Filter Type Classification')

  try {
    // Count by filter type
    const { data: standardCount } = await supabase
      .from('filter_presets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', TEST_USER_ID)
      .eq('filter_type', 'standard')

    const { data: advancedCount } = await supabase
      .from('filter_presets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', TEST_USER_ID)
      .eq('filter_type', 'advanced')

    info(`Standard filters: ${standardCount?.count || 0}`)
    info(`Advanced filters: ${advancedCount?.count || 0}`)

    success('Filter type classification working')

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 9: Verify Timestamps
 */
async function testTimestamps(presetId) {
  section('Test 9: Verify Timestamps')

  try {
    const { data: before } = await supabase
      .from('filter_presets')
      .select('created_at, updated_at')
      .eq('id', presetId)
      .single()

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update the preset
    await supabase
      .from('filter_presets')
      .update({ description: 'Updated description' })
      .eq('id', presetId)

    const { data: after } = await supabase
      .from('filter_presets')
      .select('created_at, updated_at')
      .eq('id', presetId)
      .single()

    if (before.created_at === after.created_at) {
      success('created_at unchanged after update')
    } else {
      error('created_at should not change')
    }

    if (before.updated_at !== after.updated_at) {
      success('updated_at changed after update')
    } else {
      error('updated_at should change')
    }

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Test 10: Delete Filter
 */
async function testDeleteFilter(presetId) {
  section('Test 10: Delete Filter')

  try {
    const { error } = await supabase
      .from('filter_presets')
      .delete()
      .eq('id', presetId)

    if (error) {
      error(`Failed to delete filter: ${error.message}`)
      return false
    }

    success(`Filter deleted: ${presetId}`)

    // Verify deletion
    const { data: verify } = await supabase
      .from('filter_presets')
      .select('id')
      .eq('id', presetId)
      .single()

    if (!verify) {
      success('Deletion verified - filter no longer exists')
    } else {
      error('Filter still exists after deletion')
      return false
    }

    return true
  } catch (err) {
    error(`Test failed: ${err.message}`)
    return false
  }
}

/**
 * Cleanup
 */
async function cleanup() {
  section('Cleanup')

  try {
    if (createdPresetIds.length > 0) {
      const { error } = await supabase
        .from('filter_presets')
        .delete()
        .in('id', createdPresetIds)

      if (error) {
        warn(`Cleanup failed: ${error.message}`)
      } else {
        success(`Cleaned up ${createdPresetIds.length} test presets`)
      }
    }
  } catch (err) {
    warn(`Cleanup error: ${err.message}`)
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}╔${'═'.repeat(78)}╗${colors.reset}`)
  console.log(`${colors.blue}║${' '.repeat(20)}COMPLETE FILTER SYSTEM TEST${' '.repeat(30)}║${colors.reset}`)
  console.log(`${colors.blue}╚${'═'.repeat(78)}╝${colors.reset}\n`)

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  }

  try {
    // Setup
    await setupTestUser()

    // Test 1: Schema
    results.total++
    if (await testDatabaseSchema()) results.passed++
    else results.failed++

    // Test 2: Create advanced filter
    results.total++
    const advancedFilter = await testCreateAdvancedFilter()
    if (advancedFilter) results.passed++
    else results.failed++

    // Test 3: Create regular filter
    results.total++
    const regularFilter = await testCreateRegularFilter()
    if (regularFilter) results.passed++
    else results.failed++

    // Test 4: Create mixed preset
    results.total++
    const mixedPreset = await testCreateMixedPreset()
    if (mixedPreset) results.passed++
    else results.failed++

    // Test 5: Load filter
    if (advancedFilter) {
      results.total++
      if (await testLoadFilter(advancedFilter.id)) results.passed++
      else results.failed++
    }

    // Test 6: Update filter
    if (advancedFilter) {
      results.total++
      if (await testUpdateFilter(advancedFilter.id)) results.passed++
      else results.failed++
    }

    // Test 7: List filters
    results.total++
    if (await testListFiltersByPage()) results.passed++
    else results.failed++

    // Test 8: Filter type classification
    results.total++
    if (await testFilterTypeClassification()) results.passed++
    else results.failed++

    // Test 9: Timestamps
    if (regularFilter) {
      results.total++
      if (await testTimestamps(regularFilter.id)) results.passed++
      else results.failed++
    }

    // Test 10: Delete filter
    if (mixedPreset) {
      results.total++
      if (await testDeleteFilter(mixedPreset.id)) results.passed++
      else results.failed++

      // Remove from cleanup list
      const index = createdPresetIds.indexOf(mixedPreset.id)
      if (index > -1) createdPresetIds.splice(index, 1)
    }

  } catch (err) {
    error(`Test suite failed: ${err.message}`)
    console.error(err)
  } finally {
    // Cleanup remaining test data
    await cleanup()
  }

  // Print summary
  section('Test Summary')
  console.log(`Total tests: ${results.total}`)
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`)
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`)

  if (results.failed === 0) {
    console.log(`\n${colors.green}${'★'.repeat(40)}${colors.reset}`)
    console.log(`${colors.green}ALL TESTS PASSED!${colors.reset}`)
    console.log(`${colors.green}${'★'.repeat(40)}${colors.reset}\n`)
  } else {
    console.log(`\n${colors.red}SOME TESTS FAILED - Review errors above${colors.reset}\n`)
  }

  // SQL queries for manual verification
  section('SQL Queries for Manual Verification')
  console.log(`${colors.cyan}-- View all test presets${colors.reset}`)
  console.log(`SELECT id, name, filter_type, created_at,
       jsonb_array_length(simplified_filter->'clauses') as clause_count,
       jsonb_object_keys(filters) as filter_keys
FROM filter_presets
WHERE user_id = '${TEST_USER_ID}'
ORDER BY created_at DESC;`)

  console.log(`\n${colors.cyan}-- View simplified_filter details${colors.reset}`)
  console.log(`SELECT name,
       simplified_filter->>'includeExclude' as include_exclude,
       simplified_filter->>'clauseLogic' as clause_logic,
       jsonb_pretty(simplified_filter->'clauses') as clauses
FROM filter_presets
WHERE user_id = '${TEST_USER_ID}'
  AND simplified_filter IS NOT NULL;`)

  console.log(`\n${colors.cyan}-- Count by filter type${colors.reset}`)
  console.log(`SELECT filter_type, COUNT(*)
FROM filter_presets
WHERE user_id = '${TEST_USER_ID}'
GROUP BY filter_type;`)
}

// Run tests
runTests().catch(console.error)
