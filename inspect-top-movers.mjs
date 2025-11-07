import { BigQuery } from '@google-cloud/bigquery';
import { readFileSync } from 'fs';

// Load service account credentials
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials: credentials,
});

async function inspectTopMoversTable() {
  console.log('🔍 Inspecting top_movers_daily table...\n');

  try {
    // Get table schema
    const dataset = bigquery.dataset('GI_publisher');
    const table = dataset.table('top_movers_daily');

    const [metadata] = await table.getMetadata();

    console.log('📋 TABLE SCHEMA:');
    console.log('================\n');

    if (metadata.schema && metadata.schema.fields) {
      metadata.schema.fields.forEach((field, index) => {
        console.log(`${index + 1}. ${field.name} (${field.type}${field.mode ? `, ${field.mode}` : ''})`);
      });
    }

    console.log('\n📊 SAMPLE DATA (First 5 rows):');
    console.log('================================\n');

    // Query sample data
    const query = `
      SELECT *
      FROM \`gcpp-check.GI_publisher.top_movers_daily\`
      LIMIT 5
    `;

    const [rows] = await bigquery.query(query);

    if (rows.length > 0) {
      console.log('Column names:', Object.keys(rows[0]).join(', '));
      console.log('\nFirst row sample:');
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('No data found in table.');
    }

    console.log('\n✅ Inspection complete!');

  } catch (error) {
    console.error('❌ Error inspecting table:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
  }
}

inspectTopMoversTable();
