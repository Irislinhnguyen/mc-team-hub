// OLD zone IDs (22 zones)
const oldZones = [1597085, 1563812, 1595787, 1576115, 1589956, 1540243, 1581682, 1596162, 1573617, 1538082, 1597122, 1597108, 1596109, 1588924, 1542882, 1564344, 1567304, 1597309, 1596129, 1597447, 1574823];

// NEW zone IDs (37 zones)
const newZones = [1597085, 1563812, 1558130, 1600794, 1601005, 1576115, 1569340, 1573617, 1598778, 1581682, 1542882, 1607264, 1527288, 1603075, 1540243, 1522546, 1539687, 1596162, 1538082, 1603607, 1597861, 1602998, 1597864, 1600831, 1603362, 1588924, 1597141, 1597911, 1598535, 1603034, 1564344, 1589956, 1601720, 1601045, 1598039, 1597294];

const overlap = oldZones.filter(z => newZones.includes(z));
const onlyInOld = oldZones.filter(z => !newZones.includes(z));
const onlyInNew = newZones.filter(z => !oldZones.includes(z));

console.log('=== Overlap Analysis ===');
console.log('OLD set:', oldZones.length, 'zones');
console.log('NEW set:', newZones.length, 'zones');
console.log('\nOverlap (có trong cả 2 bộ):', overlap.length, 'zones');
console.log('Overlap IDs:', overlap.sort((a,b) => a-b));
console.log('\nChỉ có trong OLD:', onlyInOld.length, 'zones');
console.log('Only OLD IDs:', onlyInOld.sort((a,b) => a-b));
console.log('\nChỉ có trong NEW:', onlyInNew.length, 'zones');
console.log('Only NEW IDs:', onlyInNew.sort((a,b) => a-b));
