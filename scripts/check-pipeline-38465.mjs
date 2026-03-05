import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://geniee-group.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkPipeline() {
  const { data, error } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', '38465')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Pipeline 38465 - Sales Team:\n');
  console.log('ID:', data.id);
  console.log('Publisher:', data.publisher);
  console.log('Group:', data.group);
  console.log('Status:', data.status);
  console.log('ZID:', data.zid);
  console.log('Sheet Row:', data.sheet_row_number);
  console.log('');
  console.log('Financial Data:');
  console.log('  day_gross:', data.day_gross);
  console.log('  day_net_rev:', data.day_net_rev);
  console.log('  imp:', data.imp);
  console.log('  ecpm:', data.ecpm);
  console.log('  max_gross:', data.max_gross);
  console.log('  q_gross:', data.q_gross);
  console.log('  q_net_rev:', data.q_net_rev);
  console.log('  revenue_share:', data.revenue_share);
  console.log('');
  console.log('Dates:');
  console.log('  starting_date:', data.starting_date);
  console.log('  proposal_date:', data.proposal_date);
  console.log('  ready_to_deliver_date:', data.ready_to_deliver_date);
  console.log('  closed_date:', data.closed_date);
  console.log('');
  console.log('Product/Channel:');
  console.log('  product:', data.product);
  console.log('  channel:', data.channel);
  console.log('');
  console.log('C+ Upgrade:', data.c_plus_upgrade);
  console.log('');
  console.log('Quarterly Breakdown:');
  if (data.metadata?.quarterly_breakdown) {
    console.log(JSON.stringify(data.metadata.quarterly_breakdown, null, 2));
  }
}

checkPipeline();
