/**
 * Check filter presets in database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPresets() {
  console.log('🔍 Checking filter presets in database...\n');

  // Get all presets
  const { data: presets, error } = await supabase
    .from('filter_presets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching presets:', error);
    return;
  }

  console.log(`✅ Found ${presets.length} presets:\n`);

  presets.forEach((preset, index) => {
    console.log(`${index + 1}. ${preset.name}`);
    console.log(`   User ID: ${preset.user_id}`);
    console.log(`   Page: ${preset.page}`);
    console.log(`   Default: ${preset.is_default}`);
    console.log(`   Created: ${preset.created_at}`);
    console.log(`   Filters:`, JSON.stringify(preset.filters).substring(0, 100) + '...');
    console.log('');
  });

  // Get users
  const { data: users } = await supabase
    .from('users')
    .select('id, email');

  console.log('\n👥 Users in database:');
  users?.forEach(user => {
    console.log(`   ${user.email} → ${user.id}`);
  });
}

checkPresets();
