import { BigQuery } from '@google-cloud/bigquery';
import { readFileSync } from 'fs';

// Load service account credentials
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials: credentials,
});

async function testNewSalesQueries() {
  console.log('🧪 Testing New Sales Queries...\n');

  const tests = [
    {
      name: 'All New Sales',
      query: `
        SELECT
          pic,
          pid,
          pubname,
          start_date,
          end_date,
          ROUND(CAST(rev_this_month AS FLOAT64), 2) as rev_this_month,
          ROUND(CAST(profit_this_month AS FLOAT64), 2) as profit_this_month,
          ROUND(CAST(rev_last_month AS FLOAT64), 2) as rev_last_month,
          ROUND(CAST(profit_last_month AS FLOAT64), 2) as profit_last_month
        FROM \`gcpp-check.GI_publisher.new_sales_master\`
        ORDER BY start_date DESC
        LIMIT 5
      `
    },
    {
      name: 'Summary Time Series',
      query: `
        SELECT
          team,
          year,
          month,
          SUM(total_revenue) as total_revenue,
          SUM(total_profit) as total_profit
        FROM \`gcpp-check.GI_publisher.final_sales_monthly\`
        GROUP BY team, year, month
        ORDER BY year ASC, month ASC
        LIMIT 10
      `
    },
    {
      name: 'Sales-CS Breakdown',
      query: `
        SELECT
          pid,
          pubname,
          start_date,
          end_date,
          month,
          year,
          ROUND(CAST(sales_rev AS FLOAT64), 2) as sales_rev,
          ROUND(CAST(sales_profit AS FLOAT64), 2) as sales_profit,
          ROUND(CAST(cs_rev AS FLOAT64), 2) as cs_rev,
          ROUND(CAST(cs_profit AS FLOAT64), 2) as cs_profit
        FROM \`gcpp-check.GI_publisher.newsales_by_pid\`
        ORDER BY year DESC, month DESC, pid
        LIMIT 5
      `
    },
    {
      name: 'Grand Totals',
      query: `
        SELECT
          SUM(sales_rev) as total_sales_rev,
          SUM(sales_profit) as total_sales_profit,
          SUM(cs_rev) as total_cs_rev,
          SUM(cs_profit) as total_cs_profit
        FROM \`gcpp-check.GI_publisher.newsales_by_pid\`
      `
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${test.name}`);
    console.log('='.repeat(80));

    try {
      const [rows] = await bigquery.query(test.query);
      console.log(`✅ Success! Returned ${rows.length} rows`);

      if (rows.length > 0) {
        console.log('\nSample data:');
        console.log(JSON.stringify(rows.slice(0, 2), null, 2));
      }
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All queries tested!');
}

testNewSalesQueries().catch(console.error);
