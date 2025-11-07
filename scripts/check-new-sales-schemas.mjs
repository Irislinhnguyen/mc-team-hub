import { BigQuery } from '@google-cloud/bigquery';
import { readFileSync } from 'fs';

// Load service account credentials
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials: credentials,
});

async function checkSchemas() {
  const tables = [
    'new_sales_master',
    'final_sales_monthly',
    'newsales_by_pid'
  ];

  console.log('🔍 Checking BigQuery table schemas for New Sales page...\n');

  for (const tableName of tables) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 TABLE: ${tableName}`);
      console.log('='.repeat(80));

      // Get table metadata
      const dataset = bigquery.dataset('GI_publisher');
      const table = dataset.table(tableName);
      const [metadata] = await table.getMetadata();

      console.log(`\n📈 Stats:`);
      console.log(`  Rows: ${parseInt(metadata.numRows || 0).toLocaleString()}`);
      console.log(`  Size: ${(parseInt(metadata.numBytes || 0) / 1024 / 1024).toFixed(2)} MB`);

      console.log(`\n🔧 Schema:`);
      metadata.schema.fields.forEach(field => {
        const mode = field.mode === 'REPEATED' ? '[]' : field.mode === 'NULLABLE' ? '?' : '';
        console.log(`  - ${field.name}: ${field.type}${mode}`);
      });

      // Sample data query
      const sampleQuery = `SELECT * FROM \`gcpp-check.GI_publisher.${tableName}\` LIMIT 3`;
      console.log(`\n📄 Sample data (first 3 rows):`);
      const [rows] = await bigquery.query(sampleQuery);

      if (rows.length > 0) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        console.log('  (No data found)');
      }

    } catch (error) {
      console.error(`❌ Error with ${tableName}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Schema check complete!');
}

checkSchemas().catch(console.error);
