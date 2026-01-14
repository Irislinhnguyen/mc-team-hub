/**
 * Script to trigger sync for SEA_CS Q4 2025
 */

import { syncQuarterlySheet } from '../lib/services/sheetToDatabaseSync.js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function runSync() {
  const quarterlySheetId = 'ecaec105-4cfb-4440-965a-02cfe4419d49'

  console.log('Starting sync for SEA_CS Q4 2025...')
  console.log('Quarterly Sheet ID:', quarterlySheetId)
  console.log()

  try {
    const result = await syncQuarterlySheet(quarterlySheetId)

    console.log()
    console.log('✅ Sync completed!')
    console.log('Result:', result)
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

runSync()
