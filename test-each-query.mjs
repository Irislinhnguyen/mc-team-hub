import BigQueryService from './lib/services/bigquery.js';
import { getDailyOpsPublisherQueries } from './lib/services/analyticsQueries.js';

async function testEachQuery() {
  console.log('🧪 Testing each query individually...\n');

  try {
    const filters = {};
    const queries = await getDailyOpsPublisherQueries(filters);

    const queryNames = [
      'publisherSummary',
      'publisherDetail',
      'mediaSummary',
      'mediaDetail',
      'newZones',
      'highTrafficZones',
      'closeWonCases'
    ];

    for (const queryName of queryNames) {
      console.log(`\n📝 Testing: ${queryName}`);
      console.log('─'.repeat(50));

      const query = queries[queryName];
      console.log('Query:', query.substring(0, 200) + '...\n');

      try {
        const result = await BigQueryService.executeQuery(query);
        console.log(`✅ SUCCESS: ${result.length} rows returned`);
      } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        console.log('\n📋 Full query that failed:');
        console.log(query);
        console.log('\n');
        process.exit(1);
      }
    }

    console.log('\n\n🎉 All queries passed!');

  } catch (error) {
    console.error('❌ Test setup failed:');
    console.error(error);
    process.exit(1);
  }
}

testEachQuery();
