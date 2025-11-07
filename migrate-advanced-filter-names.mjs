/**
 * Migration script to populate advanced_filter_names for existing presets
 * that have simplified_filter but missing advanced_filter_names
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateAdvancedFilterNames() {
  console.log('🔍 Finding presets with simplified_filter but no advanced_filter_names...\n')

  // Get all presets that have simplified_filter
  const { data: presets, error } = await supabase
    .from('filter_presets')
    .select('*')
    .not('simplified_filter', 'is', null)

  if (error) {
    console.error('❌ Error fetching presets:', error)
    return
  }

  if (!presets || presets.length === 0) {
    console.log('✅ No presets with simplified_filter found')
    return
  }

  console.log(`📊 Found ${presets.length} presets with simplified_filter\n`)

  let updatedCount = 0
  let skippedCount = 0

  for (const preset of presets) {
    // Skip if already has advanced_filter_names
    if (preset.advanced_filter_names && preset.advanced_filter_names.length > 0) {
      console.log(`⏭️  Skipping "${preset.name}" - already has advanced_filter_names`)
      skippedCount++
      continue
    }

    // Check if simplified_filter has a name field
    const simplifiedFilter = preset.simplified_filter
    let filterNames = []

    // Try to extract filter name from simplified_filter
    // The simplified_filter might have a 'name' field or we might need to get it from another source
    if (simplifiedFilter && typeof simplifiedFilter === 'object') {
      if (simplifiedFilter.name) {
        filterNames = [simplifiedFilter.name]
      } else if (simplifiedFilter.filter_name) {
        filterNames = [simplifiedFilter.filter_name]
      }
    }

    // If we couldn't extract a name, we need to look up the filter preset
    // Check if there's a reference to an advanced filter preset
    if (filterNames.length === 0) {
      // Try to find advanced filter preset with matching simplified_filter
      const { data: advancedFilters } = await supabase
        .from('filter_presets')
        .select('name, simplified_filter')
        .eq('filter_type', 'advanced')
        .eq('page', preset.page)

      if (advancedFilters && advancedFilters.length > 0) {
        // Try to match by comparing simplified_filter structure
        for (const advFilter of advancedFilters) {
          if (JSON.stringify(advFilter.simplified_filter) === JSON.stringify(simplifiedFilter)) {
            filterNames.push(advFilter.name)
            break
          }
        }
      }
    }

    if (filterNames.length > 0) {
      // Update the preset with advanced_filter_names
      const { error: updateError } = await supabase
        .from('filter_presets')
        .update({ advanced_filter_names: filterNames })
        .eq('id', preset.id)

      if (updateError) {
        console.error(`❌ Error updating preset "${preset.name}":`, updateError)
      } else {
        console.log(`✅ Updated "${preset.name}" with filter names: [${filterNames.join(', ')}]`)
        updatedCount++
      }
    } else {
      console.log(`⚠️  Could not determine filter name for "${preset.name}" - simplified_filter exists but no matching advanced filter found`)
      skippedCount++
    }
  }

  console.log(`\n📈 Migration complete!`)
  console.log(`   Updated: ${updatedCount}`)
  console.log(`   Skipped: ${skippedCount}`)
  console.log(`   Total: ${presets.length}`)
}

// Run migration
migrateAdvancedFilterNames()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
