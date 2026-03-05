import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { transformRowToPipeline } from '../lib/services/sheetTransformers.js';

async function testTransformRow21() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get row 21
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A21:AX21',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values[0];

  console.log('Testing transformRowToPipeline for Row 21...\n');

  try {
    const pipeline = transformRowToPipeline(row, 'test-user-id', 'sales', 2025);

    console.log('✅ Transform SUCCESS!\n');
    console.log('Result:');
    console.log('  publisher:', pipeline.publisher);
    console.log('  key:', pipeline.key);
    console.log('  day_gross:', pipeline.day_gross);
    console.log('  day_net_rev:', pipeline.day_net_rev);
    console.log('  imp:', pipeline.imp);
    console.log('  ecpm:', pipeline.ecpm);
    console.log('  max_gross:', pipeline.max_gross);
  } catch (error) {
    console.error('❌ Transform FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTransformRow21().catch(console.error);
