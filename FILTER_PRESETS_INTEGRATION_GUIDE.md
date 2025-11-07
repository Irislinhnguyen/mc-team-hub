# Filter Presets Feature - Integration Guide

## Overview
The saved filter presets feature has been implemented with all backend infrastructure and UI components. This guide explains how to integrate it into your analytics pages.

## What Has Been Completed

### ✅ Backend Infrastructure
1. **Database Schema** (`supabase/migrations/20250104_create_filter_presets.sql`)
   - `filter_presets` table with RLS policies
   - `filter_preset_shares` table for sharing functionality
   - Automatic triggers for single default preset per user/page
   - Full CRUD support with proper permissions

2. **API Endpoints**
   - `GET /api/filter-presets?page={page}` - List presets
   - `POST /api/filter-presets` - Create preset
   - `PATCH /api/filter-presets/[id]` - Update preset
   - `DELETE /api/filter-presets/[id]` - Delete preset
   - `GET/POST/DELETE /api/filter-presets/[id]/share` - Manage sharing

### ✅ Frontend Components
1. **React Hook** (`lib/hooks/useFilterPresets.ts`)
   - Full CRUD operations for filter presets
   - Automatic state management
   - Unsaved changes detection
   - Optimistic updates

2. **UI Components**
   - `FilterPresetManager` - Main preset selector and management UI
   - `SavePresetModal` - Modal for creating/updating presets
   - `SharePresetModal` - Modal for sharing presets with team

3. **CrossFilter Integration** (`app/contexts/CrossFilterContext.tsx`)
   - Added `exportCrossFilters()` - Get current cross-filter state
   - Added `importCrossFilters()` - Load cross-filter state from preset

### ✅ TypeScript Types (`lib/types/filterPreset.ts`)
- Complete type definitions for all preset-related data structures
- Page identifier types with validation

---

## Integration Steps

### Step 1: Run the Database Migration

First, apply the database migration to create the required tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the migration file
# supabase/migrations/20250104_create_filter_presets.sql
```

### Step 2: Add FilterPresetManager to Your Page

Here's how to integrate the FilterPresetManager into an analytics page:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { FilterPresetManager } from '../../../components/performance-tracker/FilterPresetManager'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import type { AnalyticsPage } from '../../../lib/types/filterPreset'

export default function YourAnalyticsPage() {
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const { crossFilters, exportCrossFilters, importCrossFilters } = useCrossFilter()

  // Define the page identifier (must match AnalyticsPage type)
  const pageId: AnalyticsPage = 'daily-ops' // or 'deep-dive', 'publisher-summary', etc.

  // Handler for loading a preset
  const handleLoadPreset = useCallback(
    (filters: Record<string, any>, crossFilters: any[]) => {
      // Update filter panel state
      setCurrentFilters(filters)

      // Update cross-filters
      importCrossFilters(crossFilters)
    },
    [importCrossFilters]
  )

  return (
    <div>
      {/* Add FilterPresetManager BEFORE MetadataFilterPanel */}
      <FilterPresetManager
        page={pageId}
        currentFilters={currentFilters}
        currentCrossFilters={exportCrossFilters()}
        onLoadPreset={handleLoadPreset}
      />

      {/* Your existing filter panel */}
      <MetadataFilterPanel
        filterFields={['team', 'pic', 'product']}
        onFilterChange={setCurrentFilters}
      />

      {/* Rest of your page content */}
    </div>
  )
}
```

### Step 3: Update Cross-Filter Integration (if needed)

Make sure your page properly integrates cross-filters with currentFilters:

```tsx
const { crossFilters, exportCrossFilters, importCrossFilters } = useCrossFilter()
const prevCrossFilterFieldsRef = useRef<string[]>([])

useEffect(() => {
  setCurrentFilters(prev => {
    const cleaned = { ...prev }
    prevCrossFilterFieldsRef.current.forEach(field => {
      delete cleaned[field]
    })

    const newCrossFilterValues = crossFilters.reduce((acc, filter) => {
      if (acc[filter.field]) {
        if (Array.isArray(acc[filter.field])) {
          acc[filter.field].push(filter.value)
        } else {
          acc[filter.field] = [acc[filter.field], filter.value]
        }
      } else {
        acc[filter.field] = filter.value
      }
      return acc
    }, {} as Record<string, any>)

    prevCrossFilterFieldsRef.current = crossFilters.map(f => f.field)
    return { ...cleaned, ...newCrossFilterValues }
  })
}, [crossFilters])
```

### Step 4: Implement Auto-Load Default Preset (Optional)

To automatically load the default preset when the page loads:

```tsx
import { useFilterPresets } from '@/lib/hooks/useFilterPresets'

export default function YourAnalyticsPage() {
  const { defaultPreset, isLoading } = useFilterPresets({ page: pageId })
  const [hasLoadedDefault, setHasLoadedDefault] = useState(false)

  // Auto-load default preset on mount
  useEffect(() => {
    if (!isLoading && defaultPreset && !hasLoadedDefault) {
      handleLoadPreset(defaultPreset.filters, defaultPreset.cross_filters)
      setHasLoadedDefault(true)

      // Optional: show notification
      console.log(`Auto-applied default preset: ${defaultPreset.name}`)
    }
  }, [defaultPreset, isLoading, hasLoadedDefault, handleLoadPreset])

  // ... rest of component
}
```

---

## Page Identifiers

Valid page identifiers (must match exactly):
- `'daily-ops'`
- `'deep-dive'`
- `'publisher-summary'`
- `'business-health'`
- `'profit-projections'`
- `'sales-tracking'`
- `'publisher-health'`
- `'team-setup'`

Add new pages to `lib/types/filterPreset.ts` in the `AnalyticsPage` type.

---

## Features Available to Users

Once integrated, users can:

### ✅ Save Filter Configurations
1. Click "Save As" button
2. Enter name and optional description
3. Choose to set as default
4. Preset saves current FilterPanel state AND cross-filters

### ✅ Load Saved Presets
1. Click dropdown showing current preset or "Select a filter preset..."
2. Choose from "My Presets" or "Shared with me"
3. Filters and cross-filters apply instantly

### ✅ Update Existing Presets
1. Load a preset
2. Modify filters
3. "Update" button appears (only if you own the preset or have edit permission)
4. Click to save changes

### ✅ Share Presets
1. Click ⋮ menu next to a preset you own
2. Select "Share"
3. Enter teammate's email
4. Choose permission: "View Only" or "Can Edit"

### ✅ Set Default Preset
1. Click ⋮ menu next to any preset you own
2. Select "Set as default"
3. That preset auto-loads when page opens

### ✅ Unsaved Changes Indicator
- Orange badge shows when current filters differ from loaded preset
- Reminds users to save or update before navigating away

---

## Testing Checklist

### Backend Testing
- [ ] Run database migration successfully
- [ ] Create a filter preset via API
- [ ] Load presets for a specific page
- [ ] Update a preset
- [ ] Delete a preset
- [ ] Share a preset with another user
- [ ] Verify RLS policies prevent unauthorized access

### Frontend Testing
- [ ] Save a new filter preset
- [ ] Load a saved preset
- [ ] Update an existing preset
- [ ] Delete a preset (with confirmation)
- [ ] Set/unset default preset
- [ ] Share preset with teammate
- [ ] Unsaved changes indicator appears correctly
- [ ] Cross-filters save and load correctly
- [ ] Default preset auto-loads on page mount

---

## Troubleshooting

### "Preset not found" Error
- Verify the page identifier matches the `AnalyticsPage` type exactly
- Check that the preset exists in the database

### Cross-Filters Not Saving
- Ensure you're using `exportCrossFilters()` when saving
- Verify `CrossFilterContext` is properly wrapped around your page

### Cannot Share Preset
- Confirm target user exists in the `users` table
- Check that the preset owner is the current user
- Verify email is correct

### Default Preset Not Auto-Loading
- Check that default preset logic is implemented (Step 4)
- Ensure only one preset per user/page is marked as default
- Verify `is_default` flag in database

---

## Future Enhancements (Not Yet Implemented)

- [ ] Preset versioning/history
- [ ] Import/export presets as JSON
- [ ] Organization-wide template presets
- [ ] Usage analytics for presets
- [ ] Preset categories/tags
- [ ] Quick filters (preset-based)

---

## Questions?

If you encounter issues or need clarification on integration, refer to:
- `lib/hooks/useFilterPresets.ts` for hook usage examples
- `app/components/performance-tracker/FilterPresetManager.tsx` for component API
- Existing page implementations (once integrated) as references
