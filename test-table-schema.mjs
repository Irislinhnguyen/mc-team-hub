/**
 * Check the actual schema of BigQuery table
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function checkSchema() {
  console.log('🔍 Checking BigQuery Table Schema\n');
  console.log('=' .repeat(60));

  // Get table metadata
  const dataset = bigquery.dataset('GI_publisher');
  const table = dataset.table('agg_monthly_with_pic_table_6_month');

  try {
    const [metadata] = await table.getMetadata();

    console.log('\n📊 Table Schema:');
    console.log('Table ID:', metadata.id);
    console.log('Creation Time:', metadata.creationTime);
    console.log('Last Modified:', metadata.lastModifiedTime);
    console.log('\nFields:');

    metadata.schema.fields.forEach((field, index) => {
      console.log(`  ${index + 1}. ${field.name}`);
      console.log(`     Type: ${field.type}`);
      if (field.mode) console.log(`     Mode: ${field.mode}`);

      // If it's a STRUCT/RECORD, show nested fields
      if (field.type === 'RECORD' && field.fields) {
        console.log('     Nested fields:');
        field.fields.forEach(nested => {
          console.log(`       - ${nested.name} (${nested.type})`);
        });
      }
      console.log('');
    });

    // Check specifically for request_CPM
    const requestCPMField = metadata.schema.fields.find(f => f.name === 'request_CPM');
    if (requestCPMField) {
      console.log('=' .repeat(60));
      console.log('\n🎯 request_CPM Field Details:');
      console.log(JSON.stringify(requestCPMField, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
