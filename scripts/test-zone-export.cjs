const BigQueryService = require('../lib/services/bigquery.ts').default;

const query = `
  SELECT
    zid,
    zonename,
    SUM(req) as ad_requests,
    SUM(rev) as revenue,
    AVG(request_CPM) as ecpm,
    SUM(profit) as profit,
    SUM(rev - profit) as revenue_to_publisher
  FROM `gcpp-check.GI_publisher.pub_data`
  WHERE year = 2025
    AND month IN (6, 7)
    AND zid IN (1597085, 1563812, 1595787, 1576115, 1589956, 1540243, 1581682,
      1596162, 1573617, 1538082, 1597122, 1597108, 1596109, 1588924,
      1542882, 1564344, 1567304, 1597309, 1596129, 1597447, 1574823)
  GROUP BY zid, zonename
  ORDER BY revenue DESC
`;

async function test() {
  try {
    console.log('Testing BigQuery query...');
    const results = await BigQueryService.executeQuery(query);
    console.log('Results:', results.length, 'rows');

    // Generate CSV
    const headers = ['Zone ID', 'Zone Name', 'Ad Requests', 'Revenue', 'eCPM', 'Profit', 'Revenue to Publisher'];
    const csvRows = [
      headers.join(','),
      ...results.map(row => {
        const values = [
          row.zid ?? '',
          `"${(row.zonename ?? '').replace(/"/g, '""')}"`,
          row.ad_requests ?? 0,
          row.revenue ? row.revenue.toFixed(2) : '0.00',
          row.ecpm ? row.ecpm.toFixed(2) : '0.00',
          row.profit ? row.profit.toFixed(2) : '0.00',
          row.revenue_to_publisher ? row.revenue_to_publisher.toFixed(2) : '0.00'
        ];
        return values.join(',');
      })
    ];

    console.log('\nCSV Output:');
    console.log(csvRows.join('\n'));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
