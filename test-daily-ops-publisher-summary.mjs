import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/analytics/daily-ops-publisher-summary';

async function testAPI() {
  console.log('🧪 Testing Daily Ops Publisher Summary API...\n');

  try {
    // Test with empty filters
    console.log('📤 Sending request with empty filters...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    console.log(`📥 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:');
      console.error(errorText);
      process.exit(1);
    }

    const result = await response.json();

    if (result.status !== 'ok') {
      console.error('❌ API returned error status:', result);
      process.exit(1);
    }

    console.log('\n✅ API request succeeded!\n');
    console.log('📊 Results summary:');
    console.log(`  - Publisher Summary: ${result.data.publisherSummary?.length || 0} rows`);
    console.log(`  - Publisher Detail: ${result.data.publisherDetail?.length || 0} rows`);
    console.log(`  - Media Summary: ${result.data.mediaSummary?.length || 0} rows`);
    console.log(`  - Media Detail: ${result.data.mediaDetail?.length || 0} rows`);
    console.log(`  - New Zones: ${result.data.newZones?.length || 0} rows`);
    console.log(`  - High Traffic Zones: ${result.data.highTrafficZones?.length || 0} rows`);
    console.log(`  - Close Won Cases: ${result.data.closeWonCases?.length || 0} rows`);

    // Test with team filter
    console.log('\n📤 Testing with team filter (WEB_GTI)...');
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: 'WEB_GTI' }),
    });

    if (!response2.ok) {
      const errorText = await response2.text();
      console.error('❌ API request with team filter failed:');
      console.error(errorText);
      process.exit(1);
    }

    const result2 = await response2.json();
    console.log('✅ Team filter test succeeded!');
    console.log(`  - High Traffic Zones (filtered): ${result2.data.highTrafficZones?.length || 0} rows`);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testAPI();
