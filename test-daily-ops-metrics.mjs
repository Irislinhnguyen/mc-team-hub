import { BigQuery } from '@google-cloud/bigquery';
import { readFileSync } from 'fs';

// Load service account credentials
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials: credentials,
});

async function testDailyOpsMetrics() {
  console.log('🔍 Testing Daily Ops Metrics Query...\n');

  // Test 1: Query without filters (all data for yesterday)
  const testQuery1 = `
    SELECT
      SUM(rev) as yesterday_revenue,
      SUM(profit) as yesterday_profit,
      AVG(CAST(request_CPM as FLOAT64)) as ecpm_simple,
      (SUM(rev) / NULLIF(SUM(req), 0)) * 1000 as ecpm_weighted,
      SUM(req) as yesterday_requests,
      SUM(paid) as yesterday_serve,
      COUNT(DISTINCT pid) as active_clients
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  `;

  console.log('📊 Test 1: ALL DATA (no filters)');
  console.log('Query:', testQuery1);
  console.log('\n');

  try {
    const [rows1] = await bigquery.query(testQuery1);
    console.log('Results:');
    console.log(JSON.stringify(rows1[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Check what date CURRENT_DATE() - 1 actually is
  const dateCheck = `SELECT DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) as yesterday`;
  console.log('📅 Test 2: Date Check');
  const [dateRows] = await bigquery.query(dateCheck);
  console.log('Yesterday according to BigQuery:', dateRows[0].yesterday);

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Check available dates in the table
  const dateAvailable = `
    SELECT DISTINCT DATE
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    ORDER BY DATE DESC
    LIMIT 5
  `;
  console.log('📅 Test 3: Recent dates in table');
  const [availDates] = await bigquery.query(dateAvailable);
  console.log('Most recent dates:', availDates);

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: Query with specific date (use most recent from above)
  if (availDates.length > 0) {
    const mostRecentDate = availDates[0].DATE.value;
    const testQuery4 = `
      SELECT
        SUM(rev) as yesterday_revenue,
        SUM(profit) as yesterday_profit,
        AVG(CAST(request_CPM as FLOAT64)) as ecpm_simple,
        (SUM(rev) / NULLIF(SUM(req), 0)) * 1000 as ecpm_weighted,
        SUM(req) as yesterday_requests,
        SUM(paid) as yesterday_serve,
        COUNT(DISTINCT pid) as active_clients
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE = '${mostRecentDate}'
    `;

    console.log('📊 Test 4: MOST RECENT DATE (' + mostRecentDate + ')');
    const [rows4] = await bigquery.query(testQuery4);
    console.log('Results:');
    console.log(JSON.stringify(rows4[0], null, 2));
  }

  console.log('\n✅ Tests complete!');
}

testDailyOpsMetrics();
