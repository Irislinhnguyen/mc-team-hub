import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { transformRowToPipeline } from '../lib/services/sheetTransformers.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://geniee-group.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function auditAllSalesPipelines() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get all Sales pipelines from database
  const { data: dbPipelines, error } = await supabase
    .from('pipelines')
    .select('id, publisher, sheet_row_number, day_gross, day_net_rev, imp, ecpm, max_gross, revenue_share')
    .eq('group', 'sales')
    .order('sheet_row_number', { ascending: true });

  if (error) {
    console.error('Error fetching pipelines:', error);
    return;
  }

  console.log(`Found ${dbPipelines.length} Sales pipelines in database\n`);

  // Get all data from Google Sheet (skip header rows - start from row 3)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A3:AX1000',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const sheetRows = response.data.values;

  // Map pipelines by sheet_row_number for quick lookup
  const pipelineByRow = {};
  for (const p of dbPipelines) {
    if (p.sheet_row_number) {
      pipelineByRow[p.sheet_row_number] = p;
    }
  }

  console.log('AUDIT RESULTS:\n');
  console.log('='.repeat(100));
  console.log(' discrepancies found in key fields:\n');

  let mismatches = [];
  let checkedCount = 0;

  // Check each row in Google Sheet
  for (let i = 0; i < sheetRows.length; i++) {
    const sheetRow = sheetRows[i];
    const rowNumber = i + 3; // Started from row 3

    const dbPipeline = pipelineByRow[rowNumber];
    if (!dbPipeline) {
      continue; // No pipeline in database for this row
    }

    checkedCount++;

    // Transform sheet row to pipeline object
    const sheetPipeline = transformRowToPipeline(sheetRow, 'sales', rowNumber);

    // Compare key fields
    const issues = [];

    // Check publisher (most important - should never be MA/MI value)
    if (dbPipeline.publisher !== sheetPipeline.publisher) {
      issues.push(`publisher: DB="${dbPipeline.publisher}" vs Sheet="${sheetPipeline.publisher}"`);
    }

    // Check financial fields
    const numDiff = (db, sheet) => {
      const dbNum = parseFloat(db) || 0;
      const sheetNum = parseFloat(sheet) || 0;
      return Math.abs(dbNum - sheetNum) > 0.01;
    };

    if (numDiff(dbPipeline.day_gross, sheetPipeline.day_gross)) {
      issues.push(`day_gross: DB=${dbPipeline.day_gross} vs Sheet=${sheetPipeline.day_gross}`);
    }

    if (dbPipeline.imp != sheetPipeline.imp) {
      issues.push(`imp: DB=${dbPipeline.imp} vs Sheet=${sheetPipeline.imp}`);
    }

    if (numDiff(dbPipeline.ecpm, sheetPipeline.ecpm)) {
      issues.push(`ecpm: DB=${dbPipeline.ecpm} vs Sheet=${sheetPipeline.ecpm}`);
    }

    if (numDiff(dbPipeline.max_gross, sheetPipeline.max_gross)) {
      issues.push(`max_gross: DB=${dbPipeline.max_gross} vs Sheet=${sheetPipeline.max_gross}`);
    }

    if (issues.length > 0) {
      mismatches.push({
        rowNumber,
        id: dbPipeline.id,
        publisher_db: dbPipeline.publisher,
        publisher_sheet: sheetPipeline.publisher,
        issues
      });
    }
  }

  console.log(`Checked: ${checkedCount} pipelines`);
  console.log(`Found: ${mismatches.length} pipelines with data mismatches\n`);

  if (mismatches.length > 0) {
    console.log('='.repeat(100));
    console.log('DETAILED MISMATCHES:\n');

    for (const m of mismatches.slice(0, 20)) { // Show first 20
      console.log(`Row ${m.rowNumber} | ID: ${m.id}`);
      console.log(`  Publisher: DB="${m.publisher_db}" → Sheet="${m.publisher_sheet}"`);
      for (const issue of m.issues) {
        console.log(`  ❌ ${issue}`);
      }
      console.log('');
    }

    if (mismatches.length > 20) {
      console.log(`... and ${mismatches.length - 20} more mismatches\n`);
    }

    console.log('='.repeat(100));
    console.log('\nRECOMMENDATION:');
    console.log(`Run re-sync for all ${mismatches.length} affected pipelines`);
  } else {
    console.log('✅ All pipelines are in sync!');
  }
}

auditAllSalesPipelines().catch(console.error);
