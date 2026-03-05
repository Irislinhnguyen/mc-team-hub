import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { transformRowToPipeline } from '../lib/services/sheetTransformers.js';
import { COLUMN_MAPPING_SALES } from '../lib/services/sheetToDatabaseSync.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://geniee-group.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function syncPipeline38465() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get the full row (A74:AX74)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A74:AX74',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values[0];

  // Transform using sheetTransformers
  const pipeline = transformRowToPipeline(row, 'sales', 74);

  console.log('TRANSFORMED PIPELINE DATA:\n');
  console.log('publisher:', pipeline.publisher);
  console.log('day_gross:', pipeline.day_gross);
  console.log('day_net_rev:', pipeline.day_net_rev);
  console.log('imp:', pipeline.imp);
  console.log('ecpm:', pipeline.ecpm);
  console.log('max_gross:', pipeline.max_gross);
  console.log('revenue_share:', pipeline.revenue_share);
  console.log('');

  // Update in database
  const { data, error } = await supabase
    .from('pipelines')
    .update({
      publisher: pipeline.publisher,
      day_gross: pipeline.day_gross,
      day_net_rev: pipeline.day_net_rev,
      imp: pipeline.imp,
      ecpm: pipeline.ecpm,
      max_gross: pipeline.max_gross,
      revenue_share: pipeline.revenue_share,
      starting_date: pipeline.starting_date,
      proposal_date: pipeline.proposal_date,
      interested_date: pipeline.interested_date,
      acceptance_date: pipeline.acceptance_date,
      ready_to_deliver_date: pipeline.ready_to_deliver_date,
      closed_date: pipeline.closed_date,
      c_plus_upgrade: pipeline.c_plus_upgrade,
      q_gross: pipeline.q_gross,
      q_net_rev: pipeline.q_net_rev,
      quarterly_breakdown: pipeline.quarterly_breakdown,
      metadata: pipeline.metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', '6382c888-bc99-41f2-8eb0-f5069a0a21bf')
    .select();

  if (error) {
    console.error('ERROR updating pipeline:', error);
    return;
  }

  console.log('✅ Pipeline updated successfully!');
  console.log('Affected rows:', data.length);
}

syncPipeline38465().catch(console.error);
