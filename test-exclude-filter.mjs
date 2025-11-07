#!/usr/bin/env node

/**
 * Test EXCLUDE filter SQL generation
 */

import { buildSimplifiedWhereClause } from './lib/services/analyticsQueries.ts'

async function testExcludeFilter() {
  console.log('🧪 Testing EXCLUDE filter with team...\n')

  const filter = {
    includeExclude: 'EXCLUDE',
    clauseLogic: 'OR',
    clauses: [
      {
        id: 'clause-1',
        field: 'team',
        dataType: 'string',
        operator: 'equals',
        value: 'web_gi',
        enabled: true
      },
      {
        id: 'clause-2',
        field: 'team',
        dataType: 'string',
        operator: 'equals',
        value: 'web_gti',
        enabled: true
      }
    ]
  }

  console.log('Filter config:')
  console.log(JSON.stringify(filter, null, 2))
  console.log('\n')

  try {
    const whereClause = await buildSimplifiedWhereClause(filter)
    console.log('Generated WHERE clause:')
    console.log(whereClause)
    console.log('\n')

    console.log('Expected logic:')
    console.log('Should EXCLUDE data where (team=web_gi OR team=web_gti)')
    console.log('SQL: NOT ((team condition for web_gi) OR (team condition for web_gti))')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testExcludeFilter()
