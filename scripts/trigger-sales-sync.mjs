/**
 * Trigger Sales Pipeline Sync
 * Manually sync Sales pipelines from Google Sheets using the corrected column mapping
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Import the sync function
async function triggerSalesSync() {
  const salesQuarterlySheetId = '3d841aa0-e2b7-43c4-b3ce-1a9e6cd58ac6';

  console.log('🚀 Starting Sales Pipeline Sync...');
  console.log(`Quarterly Sheet ID: ${salesQuarterlySheetId}\n`);

  try {
    // Call the sync API endpoint via Supabase Edge Function or direct sync
    // Since we can't import the sync function directly due to module issues,
    // we'll use a SQL function call instead

    const { data, error } = await supabase.rpc('trigger_sheet_sync', {
      sheet_id: salesQuarterlySheetId
    });

    if (error) {
      console.error('❌ Sync failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Sales sync completed successfully!');
    console.log('Results:', data);

  } catch (error) {
    console.error('❌ Sync error:', error.message);
    console.error('\n💡 Alternative: Trigger sync via Google Apps Script or the web UI');
    console.error('   - Open the Google Sheet');
    console.error('   - Run Extensions > Apps Script > manualSyncSales()');
    process.exit(1);
  }
}

triggerSalesSync();
