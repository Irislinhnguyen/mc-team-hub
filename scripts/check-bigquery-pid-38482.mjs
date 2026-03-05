import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  keyFilename: './service-account.json',
  projectId: 'gcpp-check'
});

async function checkPID38482() {
  const query = `
    SELECT
      pid,
      COUNT(*) as row_count,
      SUM(rev) as total_revenue,
      MIN(DATE) as min_date,
      MAX(DATE) as max_date
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = 38482
    GROUP BY pid
  `;

  console.log('Checking BigQuery for PID 38482...');

  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    if (rows.length === 0) {
      console.log('\n❌ NO DATA FOUND for PID 38482 in BigQuery!');
    } else {
      console.log('\n✅ Found data:');
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.error('\nError:', error.message);
  }
}

checkPID38482().catch(console.error);
