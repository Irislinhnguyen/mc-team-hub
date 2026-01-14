/**
 * Script to export products from Performance Tracker metadata to CSV
 *
 * Usage:
 *   node scripts/export-products-to-csv.js
 *
 * The script will:
 * 1. Fetch metadata from the local API (localhost:3000)
 * 2. Extract the products list
 * 3. Export to products.csv in the project root
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_URL = process.env.API_URL || 'http://localhost:3000'
const METADATA_ENDPOINT = '/api/performance-tracker/metadata'
const OUTPUT_FILE = path.join(__dirname, '..', 'products.csv')

/**
 * Convert array of objects to CSV string
 */
function toCSV(data) {
  if (!data || data.length === 0) {
    return 'label,value\n'
  }

  const headers = Object.keys(data[0])
  const csvRows = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Fetch metadata from Performance Tracker API
 */
async function fetchMetadata() {
  console.log(`Fetching metadata from ${API_URL}${METADATA_ENDPOINT}...`)

  const response = await fetch(`${API_URL}${METADATA_ENDPOINT}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch metadata`)
  }

  const result = await response.json()

  if (result.status !== 'ok') {
    throw new Error(result.message || 'Unknown error fetching metadata')
  }

  return result.data
}

/**
 * Main function
 */
async function main() {
  try {
    // Fetch metadata
    const metadata = await fetchMetadata()

    // Extract products
    const products = metadata.products || []
    console.log(`Found ${products.length} products`)

    // Convert to CSV
    const csv = toCSV(products)

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, csv, 'utf-8')
    console.log(`Products exported to: ${OUTPUT_FILE}`)

    // Display preview
    console.log('\nPreview (first 10 products):')
    console.log('label,value')
    products.slice(0, 10).forEach(p => {
      console.log(`"${p.label}","${p.value}"`)
    })

    if (products.length > 10) {
      console.log(`... and ${products.length - 10} more`)
    }

  } catch (error) {
    console.error('Error:', error.message)
    console.error('\nMake sure the dev server is running:')
    console.error('  npm run dev')
    process.exit(1)
  }
}

main()
