const fs = require('fs');
const path = require('path');

// Load the template library
const { getTemplateById, ALL_TEMPLATES } = require('./lib/templates/index.ts');

// Test simple query generation
const template = getTemplateById('team_daily_vs_30d');

if (!template) {
  console.error('Template not found');
  process.exit(1);
}

console.log('Template found:', template.title);
console.log('Description:', template.description);
console.log('Fields:', template.fields.length);

// Test query generation
const testParams = {
  team: 'APP_GV',
  metric: 'revenue',
  drill_down: 'publisher'
};

const query = template.buildQuery(testParams);
console.log('\n=== Generated Query ===');
console.log(query.substring(0, 500) + '...');
console.log('\nQuery length:', query.length, 'characters');
