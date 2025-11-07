/**
 * Test Templates - Call actual templates with proper parameters
 * This tests the real templates, not hardcoded queries
 */

// Import templates
const {
  performanceTemplates,
  predictionTemplates,
  formatTemplates,
  customerRiskTemplates,
  salesRevenueTemplates,
} = require('./lib/templates/index.ts');

const API_URL = 'http://localhost:3000/api/test/query';

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function testTemplate(scenario, templateId, params = {}) {
  console.log(`\n${YELLOW}[${scenario}] Testing template: ${templateId}${RESET}`);

  // Find template
  const allTemplates = [
    ...performanceTemplates,
    ...predictionTemplates,
    ...formatTemplates,
    ...customerRiskTemplates,
    ...salesRevenueTemplates,
  ];

  const template = allTemplates.find(t => t.id === templateId);
  if (!template) {
    console.error(`${RED}❌ Template not found: ${templateId}${RESET}`);
    return false;
  }

  // Build query using template's buildQuery function
  const query = template.buildQuery(params);
  console.log(`Query length: ${query.length} characters`);

  try {
    // Call API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        question: `Test: ${template.title}`,
        includeAnalysis: false, // Skip OpenAI analysis for speed
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      console.log(`${GREEN}✅ SUCCESS${RESET}`);
      console.log(`   Returned: ${data.rowCount} rows`);
      console.log(`   Execution time: ${data.executionTimeMs}ms`);
      if (data.sampleData && data.sampleData.length > 0) {
        console.log(`   Sample:`, JSON.stringify(data.sampleData[0], null, 2).substring(0, 200));
      }
      return true;
    } else {
      console.error(`${RED}❌ FAILED${RESET}`);
      console.error(`   Error: ${data.error || data.message}`);
      return false;
    }
  } catch (err) {
    console.error(`${RED}❌ ERROR${RESET}`);
    console.error(`   ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('═'.repeat(70));
  console.log('Testing Analytics Templates');
  console.log('═'.repeat(70));

  const results = [];

  // Test Scenario 1: Daily vs 30-day average
  results.push(await testTemplate(
    'Scenario 1',
    'team_daily_vs_30d',
    { team: 'All Teams', metric: 'revenue', drill_down: 'none' }
  ));

  // Test Scenario 2: Top 20 publishers
  results.push(await testTemplate(
    'Scenario 2',
    'top_publishers_by_metric',
    { metric: 'revenue', limit: '20', period: 'this month' }
  ));

  // Test Scenario 3: Churn risk
  results.push(await testTemplate(
    'Scenario 3',
    'churn_risk_detector',
    { risk_threshold: '50', min_historical_revenue: '5000' }
  ));

  // Test Scenario 4: Format growth
  results.push(await testTemplate(
    'Scenario 4',
    'adformat_growth_decline',
    { metric: 'revenue', compare_to: 'last month' }
  ));

  // Test Scenario 5: Team performance
  results.push(await testTemplate(
    'Scenario 5',
    'team_prediction_breakdown',
    { metric: 'revenue', days_back: '30' }
  ));

  // Summary
  console.log('\n' + '═'.repeat(70));
  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    console.log(`${GREEN}✅ ALL ${total} TESTS PASSED!${RESET}`);
  } else {
    console.log(`${RED}❌ ${total - passed}/${total} TESTS FAILED${RESET}`);
  }
  console.log('═'.repeat(70));
}

runTests().catch(console.error);
