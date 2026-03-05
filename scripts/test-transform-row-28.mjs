import { google } from 'googleapis';
import { readFileSync } from 'fs';

// Mock transformer logic
function transformRow(row, userId) {
  const COLUMN_MAPPING_SALES = {
    0: { field: 'key', type: 'string', required: true },
    1: { field: 'classification', type: 'string' },
    2: { field: 'poc', type: 'string', required: true },
    3: { field: 'team', type: 'string' },
    4: { field: 'ma_mi', type: 'string' },
    5: { field: 'pid', type: 'string' },
    6: { field: 'publisher', type: 'string', required: true },
    7: { field: 'mid', type: 'string' },
    8: { field: 'domain', type: 'string' },
  };

  const pipeline = { user_id: userId };

  // Apply column mappings
  for (const [colIndex, config] of Object.entries(COLUMN_MAPPING_SALES)) {
    const value = row[parseInt(colIndex)];
    const fieldName = config.field;

    console.log(`  Mapping column ${colIndex} (${fieldName}): row[${colIndex}] = "${value}"`);

    pipeline[fieldName] = value ? value.toString().trim() : null;
  }

  // Fallback logic
  if (!pipeline.publisher || pipeline.publisher.trim() === '') {
    console.log(`  Publisher is empty, falling back to domain: "${pipeline.domain}"`);
    pipeline.publisher = pipeline.domain || 'Unknown Publisher';
  }

  return pipeline;
}

async function testTransform() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('Testing Row 28 transformation...\n');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A28:I28',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values?.[0] || [];

  console.log('Raw row data:');
  for (let i = 0; i < row.length; i++) {
    console.log(`  row[${i}] = "${row[i] || '(empty)'}"`);
  }

  console.log('\nTransforming...');
  const pipeline = transformRow(row, 'test-user');

  console.log('\nResult:');
  console.log(`  publisher: "${pipeline.publisher}"`);
  console.log(`  pid: "${pipeline.pid}"`);
  console.log(`  ma_mi: "${pipeline.ma_mi}"`);
  console.log(`  domain: "${pipeline.domain}"`);
  console.log(`  mid: "${pipeline.mid}"`);
}

testTransform().catch(console.error);
