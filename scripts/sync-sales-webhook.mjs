/**
 * Trigger Sales Pipeline Sync via Webhook
 * Calls the same webhook that Google Apps Script uses
 */

const WEBHOOK_URL = 'https://mc.genieegroup.com/api/pipelines/webhook/sheet-changed';
const WEBHOOK_TOKEN = 'd1ee7b09894cf2fee7ee665ef80fcdb673bbac099e1ee14a426ed8a6f27371b6';
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
const SHEET_NAME = 'SEA_Sales';

async function triggerSalesSync() {
  console.log('========================================');
  console.log('🔄 Triggering Sales Pipeline Sync...');
  console.log('========================================');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Sheet Name:', SHEET_NAME);
  console.log('');

  const payload = {
    token: WEBHOOK_TOKEN,
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: SHEET_NAME,
    trigger_type: 'manual',
    timestamp: new Date().toISOString(),
    row_count: 0,
    changed_rows: [], // Empty = full sync
    user_email: 'manual-script'
  };

  try {
    console.log('Sending webhook request...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    const statusCode = response.status;

    console.log('Response status:', statusCode);
    console.log('');

    if (statusCode === 200) {
      console.log('✅ Sales sync triggered successfully!');
      try {
        const responseData = JSON.parse(responseText);
        console.log('Response:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('Response:', responseText);
      }
    } else {
      console.log('⚠️ Sync request failed');
      console.log('Status code:', statusCode);
      console.log('Response:', responseText);

      if (statusCode === 401) {
        console.log('\n❌ Authentication failed - check webhook token');
      } else if (statusCode === 403) {
        console.log('\n❌ Forbidden - spreadsheet ID mismatch');
      } else if (statusCode === 423) {
        console.log('\n⚠️ Sync is locked/paused for this sheet');
      }
    }

    console.log('========================================');

  } catch (error) {
    console.error('❌ Error triggering sync:', error.message);
    console.error(error.stack);
    console.log('========================================');
    process.exit(1);
  }
}

triggerSalesSync();
