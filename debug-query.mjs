/**
 * Debug: Print the generated SQL query
 */

import { getPerspectiveConfig } from './lib/config/perspectiveConfigs.ts';
import { buildDeepDiveQuery } from './lib/services/deepDiveQueryBuilder.ts';

const perspective = 'pid'; // Test with PID perspective
const config = getPerspectiveConfig(perspective);

const params = {
  period1: {
    start: '2025-10-01',
    end: '2025-10-07'
  },
  period2: {
    start: '2025-10-08',
    end: '2025-10-14'
  }
};

const query = buildDeepDiveQuery(config, params);

console.log('Generated SQL Query:');
console.log('='.repeat(80));

// Print with line numbers
const lines = query.split('\n');
lines.forEach((line, index) => {
  const lineNum = (index + 1).toString().padStart(3, ' ');
  console.log(`${lineNum} | ${line}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nLine 110 area:');
console.log('='.repeat(80));

// Show lines around line 110
for (let i = 105; i <= 115; i++) {
  if (lines[i - 1]) {
    const marker = i === 110 ? ' <<<< ERROR HERE' : '';
    console.log(`${i.toString().padStart(3, ' ')} | ${lines[i - 1]}${marker}`);
  }
}
