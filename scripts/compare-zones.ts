import BigQueryService from '../lib/services/bigquery.ts'

// NEW zone IDs (37 zones)
const newZoneIds = '1597085, 1563812, 1558130, 1600794, 1601005, 1576115, 1569340, 1573617, 1598778, 1581682, 1542882, 1607264, 1527288, 1603075, 1540243, 1522546, 1539687, 1596162, 1538082, 1603607, 1597861, 1602998, 1597864, 1600831, 1603362, 1588924, 1597141, 1597911, 1598535, 1603034, 1564344, 1589956, 1601720, 1601045, 1598039, 1597294'

// OLD zone IDs (22 zones)
const oldZoneIds = '1597085, 1563812, 1595787, 1576115, 1589956, 1540243, 1581682, 1596162, 1573617, 1538082, 1597122, 1597108, 1596109, 1588924, 1542882, 1564344, 1567304, 1597309, 1596129, 1597447, 1574823'

async function compare() {
  console.log('=== NEW Zone IDs (37 zones) ===')
  const query1 = `SELECT month, COUNT(DISTINCT zid) as zone_count FROM \`gcpp-check.GI_publisher.pub_data\` WHERE year = 2025 AND month IN (6, 7) AND zid IN (${newZoneIds}) GROUP BY month ORDER BY month`
  const r1 = await BigQueryService.executeQuery(query1)
  console.log('Month 6-7:', r1)

  console.log('\n=== OLD Zone IDs (22 zones) ===')
  const query2 = `SELECT month, COUNT(DISTINCT zid) as zone_count FROM \`gcpp-check.GI_publisher.pub_data\` WHERE year = 2025 AND month IN (6, 7) AND zid IN (${oldZoneIds}) GROUP BY month ORDER BY month`
  const r2 = await BigQueryService.executeQuery(query2)
  console.log('Month 6-7:', r2)

  console.log('\n=== NEW Zone IDs (months 5,6,7) ===')
  const query3 = `SELECT month, COUNT(DISTINCT zid) as zone_count FROM \`gcpp-check.GI_publisher.pub_data\` WHERE year = 2025 AND month IN (5, 6, 7) AND zid IN (${newZoneIds}) GROUP BY month ORDER BY month`
  const r3 = await BigQueryService.executeQuery(query3)
  console.log('Month 5,6,7:', r3)

  // Check which zones have no data in each month
  console.log('\n=== Zones with NO data in each month (NEW zone IDs) ===')
  for (const m of [5, 6, 7]) {
    const q = `SELECT DISTINCT zid FROM (${newZoneIds.split(',').map(id => `SELECT ${id.trim()} as zid`).join(' UNION ALL ')}) AS all_zones WHERE zid NOT IN (SELECT DISTINCT zid FROM \`gcpp-check.GI_publisher.pub_data\` WHERE year = 2025 AND month = ${m})`
    const missing = await BigQueryService.executeQuery(q)
    console.log(`Month ${m}: ${missing.length} zones with no data`)
  }
}

compare()
