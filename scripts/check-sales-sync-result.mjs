import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://geniee-group.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSalesData() {
  const { data, error } = await supabase
    .from('pipelines')
    .select('day_gross, q_gross, zid, c_plus_upgrade, ready_to_deliver_date')
    .eq('group', 'sales')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sales pipelines - Sample data (10 records):\n');
  console.log('day_gross | q_gross | zid | c_plus_upgrade | ready_to_deliver_date');
  console.log('----------|--------|-----|---------------|--------------------');

  data.forEach(p => {
    const dg = p.day_gross ?? 0;
    const qg = p.q_gross ?? 0;
    const zid = p.zid ?? 'NULL';
    const cpu = p.c_plus_upgrade ?? 'NULL';
    const rtd = p.ready_to_deliver_date ?? 'NULL';
    console.log(`${dg} | ${qg} | ${zid} | ${cpu} | ${rtd}`);
  });

  console.log('\nChecking day_gross > 0...');
  const { count } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })
    .eq('group', 'sales')
    .gt('day_gross', 0);

  console.log(`Sales pipelines with day_gross > 0: ${count} records`);
}

checkSalesData();
