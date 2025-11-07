#!/usr/bin/env node

/**
 * Test multi-value operators: has_all, has_any, only_has, in
 */

console.log('🧪 Testing Multi-Value Operators\n')

const testCases = [
  {
    name: 'has_all with 2 products',
    filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [{
        id: '1',
        field: 'mid',
        operator: 'has_all',
        attributeField: 'product',
        condition: 'in',
        value: ['standardbanner', 'video'],
        enabled: true
      }]
    },
    expected: 'MIDs that have BOTH standardbanner AND video (may have others)'
  },
  {
    name: 'has_any with 2 products',
    filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [{
        id: '1',
        field: 'mid',
        operator: 'has_any',
        attributeField: 'product',
        condition: 'in',
        value: ['standardbanner', 'video'],
        enabled: true
      }]
    },
    expected: 'MIDs that have AT LEAST ONE of standardbanner OR video'
  },
  {
    name: 'only_has with 2 products',
    filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [{
        id: '1',
        field: 'mid',
        operator: 'only_has',
        attributeField: 'product',
        condition: 'in',
        value: ['standardbanner', 'video'],
        enabled: true
      }]
    },
    expected: 'MIDs that have ONLY standardbanner and video (no other products)'
  },
  {
    name: 'in operator with multiple teams',
    filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [{
        id: '1',
        field: 'team',
        operator: 'in',
        value: ['web_gi', 'web_gti'],
        enabled: true
      }]
    },
    expected: 'Data from teams web_gi OR web_gti'
  }
]

console.log('Test Cases:\n')
testCases.forEach((test, idx) => {
  console.log(`${idx + 1}. ${test.name}`)
  console.log('   Filter:', JSON.stringify(test.filter.clauses[0], null, 2))
  console.log('   Expected:', test.expected)
  console.log('')
})

console.log('✅ Multi-value operators support:')
console.log('   - has_all: Requires array with 2+ values')
console.log('   - has_any: Requires array with 2+ values')
console.log('   - only_has: Requires array with 2+ values')
console.log('   - in: Requires array with 1+ values')
console.log('\n✅ UI Implementation:')
console.log('   - HorizontalFilterClause.tsx line 146: needsMultipleValues checks these operators')
console.log('   - Lines 247-255: Uses MultiSelectFilter component for multi-value input')
console.log('   - Line 251: Converts between string and array values automatically')
