// Data from previous query (OLD zone IDs, month 6-7)
const rows = [
  {month:6,zid:1576115},{month:6,zid:1574823},{month:6,zid:1542882},{month:6,zid:1581682},{month:6,zid:1563812},{month:6,zid:1538082},{month:6,zid:1573617},{month:6,zid:1563812},{month:6,zid:1589956},{month:6,zid:1540243},{month:6,zid:1581682},{month:6,zid:1588924},{month:6,zid:1564344},{month:6,zid:1567304},
  {month:7,zid:1597085},{month:7,zid:1563812},{month:7,zid:1595787},{month:7,zid:1576115},{month:7,zid:1589956},{month:7,zid:1581682},{month:7,zid:1540243},{month:7,zid:1589956},{month:7,zid:1596162},{month:7,zid:1538082},{month:7,zid:1573617},{month:7,zid:1597122},{month:7,zid:1597108},{month:7,zid:1588924},{month:7,zid:1542882},{month:7,zid:1564344},{month:7,zid:1567304},{month:7,zid:1597309},{month:7,zid:1596129},{month:7,zid:1597447},{month:7,zid:1574823}
];

const uniqueZones = [...new Set(rows.map(r => r.zid))];
console.log('=== OLD Zone IDs - Month 6-7 ===');
console.log('Total rows:', rows.length);
console.log('Unique zones:', uniqueZones.length);

const zoneCount = {};
rows.forEach(r => {
  zoneCount[r.zid] = (zoneCount[r.zid] || 0) + 1;
});

const multiMonth = Object.entries(zoneCount).filter(([z,c]) => c > 1);
console.log('\nZones xuất hiện ở cả 2 tháng:', multiMonth.length);
multiMonth.forEach(([z,c]) => console.log('  Zone', z, ':', c, 'rows'));

// For NEW zone IDs (month 5-6-7)
const rowsNew = [
  {month:5,zid:1542882},{month:5,zid:1581682},{month:5,zid:1573617},{month:5,zid:1538082},{month:5,zid:1576115},{month:5,zid:1540243},{month:5,zid:1564344},{month:5,zid:1588924},{month:5,zid:1567304},
  {month:6,zid:1576115},{month:6,zid:1542882},{month:6,zid:1581682},{month:6,zid:1563812},{month:6,zid:1538082},{month:6,zid:1540243},{month:6,zid:1573617},{month:6,zid:1564344},{month:6,zid:1588924},{month:6,zid:1589956},{month:6,zid:1597085},
  {month:7,zid:1597085},{month:7,zid:1563812},{month:7,zid:1576115},{month:7,zid:1589956},{month:7,zid:1581682},{month:7,zid:1540243},{month:7,zid:1596162},{month:7,zid:1538082},{month:7,zid:1573617},{month:7,zid:1597122},{month:7,zid:1597108},{month:7,zid:1588924},{month:7,zid:1542882},{month:7,zid:1564344},{month:7,zid:1567304},{month:7,zid:1597309},{month:7,zid:1596129},{month:7,zid:1597447},{month:7,zid:1574823}
];

const uniqueZonesNew = [...new Set(rowsNew.map(r => r.zid))];
console.log('\n=== NEW Zone IDs - Month 5-6-7 ===');
console.log('Total rows:', rowsNew.length);
console.log('Unique zones:', uniqueZonesNew.length);

const zoneCountNew = {};
rowsNew.forEach(r => {
  zoneCountNew[r.zid] = (zoneCountNew[r.zid] || 0) + 1;
});

const multiMonthNew = Object.entries(zoneCountNew).filter(([z,c]) => c > 1);
console.log('\nZones xuất hiện ở nhiều tháng:', multiMonthNew.length);
multiMonthNew.forEach(([z,c]) => {
  const months = rowsNew.filter(r => r.zid === parseInt(z)).map(r => r.month).sort();
  console.log('  Zone', z, ':', c, 'rows (tháng', months.join(','), ')');
});
