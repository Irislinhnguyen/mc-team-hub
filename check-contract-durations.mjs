/**
 * Check actual contract durations in BigQuery
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf-8'));

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  credentials: serviceAccount,
});

async function checkContractDurations() {
  console.log('Checking contract durations for Feb 2026...\n');

  const query = `
    SELECT
      pic,
      pid,
      start_date,
      end_date,
      DATE_DIFF(end_date, start_date, DAY) as contract_duration_days,
      CASE
        WHEN DATE_DIFF(end_date, start_date, DAY) <= 90 THEN 'SALES'
        ELSE 'CS'
      END as phase
    FROM \`gcpp-check.GI_publisher.new_sales_master\`
    WHERE start_date <= '2026-02-28' AND end_date >= '2026-02-01'
    ORDER BY contract_duration_days DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({ query });

    console.log('CONTRACT DURATIONS:');
    console.log('Total rows:', rows.length);
    console.log('');

    let salesCount = 0;
    let csCount = 0;

    rows.forEach((row, i) => {
      const duration = row.contract_duration_days?.value || row.contract_duration_days;
      const phase = row.phase?.value || row.phase;
      const pic = row.pic?.value || row.pic;
      const pid = row.pid?.value || row.pid;

      if (phase === 'SALES') {
        salesCount++;
      } else {
        csCount++;
      }

      console.log(`${i + 1}. ${pic}/${pid}: ${row.start_date} to ${row.end_date}`);
      console.log(`   Duration: ${duration} days -> ${phase}`);
    });

    console.log('');
    console.log('SUMMARY:');
    console.log(`  Sales (≤90 days): ${salesCount}`);
    console.log(`  CS (>90 days): ${csCount}`);
    console.log(`  Total: ${salesCount + csCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkContractDurations();
