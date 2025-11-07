const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

const projectId = 'gcpp-check';
const keyFilename = './service-account.json';

const bigquery = new BigQuery({
  projectId,
  keyFilename,
});

async function inspectTable(tableName) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Table: ${tableName}`);
    console.log('='.repeat(80));

    const table = bigquery.dataset('GI_publisher').table(tableName);
    const [metadata] = await table.getMetadata();

    // Show schema
    console.log('\nSCHEMA:');
    console.log('--------');
    metadata.schema.fields.forEach((field, idx) => {
      console.log(`${idx + 1}. ${field.name} (${field.type})`);
    });

    // Show sample data
    console.log('\nSAMPLE DATA (first row):');
    console.log('-----------------------');
    const [rows] = await bigquery.dataset('GI_publisher').table(tableName).getRows({ maxResults: 1 });

    if (rows.length > 0) {
      const row = rows[0];
      console.log(JSON.stringify(row, null, 2));
    }

    // Show row count
    const [countResult] = await bigquery.query({
      query: `SELECT COUNT(*) as row_count FROM \`gcpp-check.GI_publisher.${tableName}\``,
    });
    console.log(`\nTotal Rows: ${countResult[0].row_count}`);

  } catch (error) {
    console.error(`Error inspecting ${tableName}:`, error.message);
  }
}

async function main() {
  const tables = [
    'agg_monthly_with_pic_table_6_month',
    'weekly_prediction_table',
    'top_movers_daily',
  ];

  for (const table of tables) {
    await inspectTable(table);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

main().catch(console.error);
