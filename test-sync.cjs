const { syncQuarterlySheet } = require('./dist/lib/services/sheetToDatabaseSync');

async function testSync() {
  console.log('Starting sync...');
  try {
    const result = await syncQuarterlySheet('ecaec105-4cfb-4440-965a-02cfe4419d49');
    console.log('\n=== SYNC RESULT ===');
    console.log('Success:', result.success);
    console.log('Total:', result.total);
    console.log('Created:', result.created);
    console.log('Updated:', result.updated);
    console.log('Duration:', result.duration_ms, 'ms');
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
  } catch (error) {
    console.error('SYNC ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSync().catch(console.error);
