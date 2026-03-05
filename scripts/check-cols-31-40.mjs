import fs from 'fs';

const csv = fs.readFileSync('d:\\Downloads\\[Weekly]  4Q 2025  GAP FILL SHEET_SEA - SEA_Sales.csv', 'utf-8');
const lines = csv.split('\n');

// Find data row
let dataLine = null;
for (let i = 7; i < 15; i++) {
  if (lines[i] && (lines[i].includes('Febri') || lines[i].includes('Safitri'))) {
    dataLine = lines[i];
    break;
  }
}

if (dataLine) {
  const parseCSV = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const cols = parseCSV(dataLine);

  console.log('Columns 31-40 from data row:');
  for (let i = 31; i < Math.min(41, cols.length); i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    const val = cols[i] ? cols[i].substring(0, 30) : '(empty)';
    console.log(`[${i}] ${colLetter}: ${val}`);
  }
}
