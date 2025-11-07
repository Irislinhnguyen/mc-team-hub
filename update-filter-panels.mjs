/**
 * Script để update tất cả MetadataFilterPanel thêm prop "page"
 */

import fs from 'fs/promises'
import path from 'path'

const updates = [
  {
    file: 'app/(protected)/performance-tracker/daily-ops/page.tsx',
    page: 'daily-ops',
  },
  {
    file: 'app/(protected)/performance-tracker/daily-ops-publisher-summary/page.tsx',
    page: 'publisher-summary',
  },
  {
    file: 'app/(protected)/performance-tracker/daily-ops-publisher-summary/page-refactored.tsx',
    page: 'publisher-summary',
  },
  {
    file: 'app/(protected)/performance-tracker/business-health/page.tsx',
    page: 'business-health',
  },
  {
    file: 'app/(protected)/performance-tracker/new-sales/page.tsx',
    page: 'new-sales',
  },
  {
    file: 'app/(protected)/performance-tracker/profit-projections/page.tsx',
    page: 'profit-projections',
  },
]

async function updateFile(filePath, pageName) {
  try {
    console.log(`\n📝 Updating: ${filePath}`)

    const content = await fs.readFile(filePath, 'utf-8')

    // Pattern để tìm <MetadataFilterPanel mà chưa có prop page
    const pattern = /(<MetadataFilterPanel\s+(?![^>]*\bpage=))(?=filterFields)/g

    // Check xem có match không
    if (!pattern.test(content)) {
      console.log(`   ⚠️  File might already have 'page' prop or different structure`)
      return
    }

    // Reset pattern
    const replacePattern = /(<MetadataFilterPanel\s+)(?=filterFields)/g
    const replacement = `$1page="${pageName}"\n        `

    const updatedContent = content.replace(replacePattern, replacement)

    if (content === updatedContent) {
      console.log(`   ℹ️  No changes needed`)
      return
    }

    await fs.writeFile(filePath, updatedContent, 'utf-8')
    console.log(`   ✅ Updated successfully`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Starting update of MetadataFilterPanel components...\n')
  console.log('=' .repeat(60))

  for (const { file, page } of updates) {
    await updateFile(file, page)
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Done! All files processed.\n')
}

main()
