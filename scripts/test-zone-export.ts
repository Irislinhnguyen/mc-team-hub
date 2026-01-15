import BigQueryService from '../lib/services/bigquery.ts'

const zoneIds = '1597085, 1563812, 1558130, 1600794, 1601005, 1576115, 1569340, 1573617, 1598778, 1581682, 1542882, 1607264, 1527288, 1603075, 1540243, 1522546, 1539687, 1596162, 1538082, 1603607, 1597861, 1602998, 1597864, 1600831, 1603362, 1588924, 1597141, 1597911, 1598535, 1603034, 1564344, 1589956, 1601720, 1601045, 1598039, 1597294'

const query = /*sql*/`
  SELECT
    month,
    zid,
    zonename,
    SUM(req) as ad_requests,
    SUM(rev) as revenue,
    AVG(request_CPM) as ecpm,
    SUM(profit) as profit,
    SUM(rev - profit) as revenue_to_publisher
  FROM \`gcpp-check.GI_publisher.pub_data\`
  WHERE year = 2025
    AND month IN (5, 6, 7)
    AND zid IN (${zoneIds})
  GROUP BY month, zid, zonename
  ORDER BY month, revenue DESC
`

async function test() {
  try {
    console.log('Testing BigQuery query for zone revenue export (May-July 2025)...')
    const results = await BigQueryService.executeQuery(query)
    console.log(`Found ${results.length} rows`)

    if (results.length === 0) {
      console.log('No data found.')
      return
    }

    // Generate CSV
    const headers = ['Month', 'Zone ID', 'Zone Name', 'Ad Requests', 'Revenue', 'eCPM', 'Profit', 'Revenue to Publisher']
    const csvRows = [
      headers.join(','),
      ...results.map(row => {
        const values = [
          row.month ?? '',
          row.zid ?? '',
          `"${(row.zonename ?? '').replace(/"/g, '""')}"`,
          row.ad_requests ?? 0,
          row.revenue ? row.revenue.toFixed(2) : '0.00',
          row.ecpm ? row.ecpm.toFixed(2) : '0.00',
          row.profit ? row.profit.toFixed(2) : '0.00',
          row.revenue_to_publisher ? row.revenue_to_publisher.toFixed(2) : '0.00'
        ]
        return values.join(',')
      })
    ]

    // Write to file
    const fs = await import('fs')
    const csvContent = csvRows.join('\n')
    const filename = 'zone-revenue-may-jun-jul-2025.csv'
    fs.writeFileSync(filename, csvContent)
    console.log(`\nCSV saved to: ${filename}`)

    // Summary by month
    console.log('\n=== Summary by Month ===')
    const months = [5, 6, 7]
    months.forEach(m => {
      const monthData = results.filter((r: any) => r.month === m)
      const totalRev = monthData.reduce((sum: number, r: any) => sum + (r.revenue || 0), 0)
      const totalProfit = monthData.reduce((sum: number, r: any) => sum + (r.profit || 0), 0)
      console.log(`Month ${m}: ${monthData.length} zones, Revenue: $${totalRev.toFixed(2)}, Profit: $${totalProfit.toFixed(2)}`)
    })

    // Show top 5 per month
    console.log('\n=== Top 5 Zones by Month ===')
    months.forEach(m => {
      const monthData = results.filter((r: any) => r.month === m).slice(0, 5)
      console.log(`\nMonth ${m}:`)
      monthData.forEach((r: any, i: number) => {
        console.log(`  ${i+1}. [${r.zid}] ${r.zonename?.substring(0, 40)}... - $${r.revenue?.toFixed(2)}`)
      })
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

test()
