import { BigQuery } from '@google-cloud/bigquery';
import { readFileSync } from 'fs';

// Load service account credentials
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials: credentials,
});

async function testRevFlagValues() {
  console.log('🔍 Testing rev_flag distinct values...\n');

  const query = `
    SELECT DISTINCT rev_flag
    FROM \`gcpp-check.GI_publisher.top_movers_daily\`
    WHERE rev_flag IS NOT NULL
    ORDER BY rev_flag
  `;

  console.log('Query:', query);
  console.log('\n');

  try {
    const [rows] = await bigquery.query(query);
    console.log('📊 Distinct rev_flag values found:');
    console.log('='.repeat(50));
    rows.forEach((row, index) => {
      console.log(`${index + 1}. "${row.rev_flag}"`);
    });
    console.log('='.repeat(50));
    console.log(`\nTotal: ${rows.length} distinct values\n`);

    // Also show as array for easy copy-paste
    console.log('Array format:');
    console.log(JSON.stringify(rows.map(r => r.rev_flag), null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRevFlagValues();
