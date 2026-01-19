/**
 * Script to backup and update product_name in BigQuery based on CSV mapping
 *
 * CSV file: c:\Users\Admin\Downloads\Zone monitoring by date-2026-01-12.csv
 * Format: zonename, product (all "sticky" in this case)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CSV file path
const CSV_PATH = 'c:\\Users\\Admin\\Downloads\\Zone monitoring by date-2026-01-12.csv'

// Read and parse CSV to extract zonename -> product mapping
function parseCSVMapping(filePath: string): Map<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const mapping = new Map<string, string>()

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV manually to handle quoted fields
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current)

    // CSV columns: date,pic,pid,mid,zid,zonename,product,req,...
    if (fields.length >= 7) {
      const zonename = fields[5].trim()
      const product = fields[6].trim()
      if (zonename && product) {
        mapping.set(zonename, product)
      }
    }
  }

  return mapping
}

// Generate SQL queries
function generateSQL(mapping: Map<string, string>): { backupSQL: string; updateSQL: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupTable = `updated_product_name_backup_${timestamp}`

  // Backup SQL
  const backupSQL = `-- Backup current table
CREATE TABLE \`GI_publisher.${backupTable}\`
AS
SELECT *
FROM \`GI_publisher.updated_product_name\`;

-- Verify backup
SELECT COUNT(*) as backup_count FROM \`GI_publisher.${backupTable}\`;`

  // Update SQL with CASE WHEN
  const caseClauses: string[] = []
  for (const [zonename, product] of mapping.entries()) {
    // Escape single quotes
    const safeZonename = zonename.replace(/'/g, "''")
    const safeProduct = product.replace(/'/g, "''")
    caseClauses.push(`  WHEN zonename = '${safeZonename}' THEN '${safeProduct}'`)
  }

  const updateSQL = `-- Update product based on CSV mapping
-- Total mappings: ${mapping.size}

UPDATE \`GI_publisher.updated_product_name\`
SET product = CASE
${caseClauses.join('\n')}
  ELSE product
END
WHERE zonename IN (
${Array.from(mapping.keys()).map(z => `  '${z.replace(/'/g, "''")}'`).join(',\n')}
);

-- Verify update
SELECT product, COUNT(*) as count
FROM \`GI_publisher.updated_product_name\`
GROUP BY product
ORDER BY count DESC;`

  return { backupSQL, updateSQL }
}

// Main function
async function main() {
  console.log('=== BigQuery Product Update Script ===\n')
  console.log(`Reading CSV: ${CSV_PATH}`)

  const mapping = parseCSVMapping(CSV_PATH)
  console.log(`Found ${mapping.size} unique zonename -> product mappings`)

  // Show sample mappings
  console.log('\n=== Sample Mappings ===')
  let count = 0
  for (const [zonename, product] of mapping.entries()) {
    if (count++ >= 10) break
    console.log(`  ${zonename} -> ${product}`)
  }

  // Generate SQL
  const { backupSQL, updateSQL } = generateSQL(mapping)

  // Write SQL files
  const outputDir = path.join(__dirname, '../sql-backup')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  fs.writeFileSync(
    path.join(outputDir, `01-backup-${timestamp}.sql`),
    backupSQL
  )

  fs.writeFileSync(
    path.join(outputDir, `02-update-${timestamp}.sql`),
    updateSQL
  )

  console.log(`\n=== SQL Files Generated ===`)
  console.log(`  ${path.join(outputDir, `01-backup-${timestamp}.sql`)}`)
  console.log(`  ${path.join(outputDir, `02-update-${timestamp}.sql`)}`)

  console.log('\n=== To Execute ===')
  console.log('1. Run the backup SQL first in BigQuery Console')
  console.log('2. Verify the backup table was created')
  console.log('3. Run the update SQL')
  console.log('4. Verify the results')

  // Also output a summary
  console.log('\n=== Product Distribution in CSV ===')
  const productCounts = new Map<string, number>()
  for (const product of mapping.values()) {
    productCounts.set(product, (productCounts.get(product) || 0) + 1)
  }
  for (const [product, count] of productCounts.entries()) {
    console.log(`  ${product}: ${count}`)
  }
}

main().catch(console.error)
