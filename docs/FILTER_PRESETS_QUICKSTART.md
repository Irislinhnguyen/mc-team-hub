# Filter Presets - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Apply Database Migration (1 min)

```bash
cd D:/code-project/query-stream-ai
supabase db push
```

This creates the `filter_presets` and `filter_preset_shares` tables.

---

### Step 2: Add to One Analytics Page (3 mins)

Let's integrate into the **Daily Ops** page as an example.

**File:** `app/(protected)/performance-tracker/daily-ops/page.tsx`

#### 2a. Add Imports (at the top)

```tsx
import { FilterPresetManager } from '../../../components/performance-tracker/FilterPresetManager'
import type { AnalyticsPage } from '../../../../lib/types/filterPreset'
```

#### 2b. Get Cross-Filter Functions

Update your `useCrossFilter` import:

```tsx
const { crossFilters, exportCrossFilters, importCrossFilters } = useCrossFilter()
```

#### 2c. Add Load Handler

Add this callback before your return statement:

```tsx
const handleLoadPreset = useCallback(
  (filters: Record<string, any>, crossFilters: any[]) => {
    setCurrentFilters(filters)
    importCrossFilters(crossFilters)
  },
  [importCrossFilters]
)
```

#### 2d. Add Component to JSX

Add FilterPresetManager **above** your MetadataFilterPanel:

```tsx
return (
  <AnalyticsPageLayout title="Daily Ops Report (CS)" showExport={true} contentRef={contentRef}>
    {/* ADD THIS: */}
    <FilterPresetManager
      page="daily-ops"
      currentFilters={currentFilters}
      currentCrossFilters={exportCrossFilters()}
      onLoadPreset={handleLoadPreset}
    />

    {/* Existing filter panel */}
    <MetadataFilterPanel
      filterFields={['team', 'pic', 'rev_flag']}
      onFilterChange={setCurrentFilters}
      isLoading={loading}
    />
    {/* ... rest of your page ... */}
  </AnalyticsPageLayout>
)
```

---

### Step 3: Test It! (1 min)

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Navigate to Daily Ops page

3. You should see a new filter preset selector at the top

4. Try it:
   - Select some filters
   - Click "Save As"
   - Enter name "Test Preset"
   - Click "Save Preset"
   - ✅ Success! You now have a saved filter preset

---

## 📸 What You'll See

```
┌────────────────────────────────────────────────────────────┐
│  🔖 Select a filter preset...  ▼         📁 Save As        │
└────────────────────────────────────────────────────────────┘
```

After saving a preset:

```
┌────────────────────────────────────────────────────────────┐
│  🔖 Test Preset ⭐ ▼                      💾 Update         │
│  ⚠️ Unsaved changes                                         │
└────────────────────────────────────────────────────────────┘
```

When clicking dropdown:

```
┌────────────────────────────────────────┐
│  My Presets                            │
│  ─────────────────────────────────     │
│  ⭐ Test Preset                    ⋮   │
│     Another Preset                 ⋮   │
│                                        │
│  Shared with me                        │
│  ─────────────────────────────────     │
│  🔗 Team Filter (john@example.com)     │
└────────────────────────────────────────┘
```

---

## 🎯 Complete Example

Here's the complete code for Daily Ops page with filter presets:

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FilterPresetManager } from '../../../components/performance-tracker/FilterPresetManager'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import type { AnalyticsPage } from '../../../../lib/types/filterPreset'
// ... other imports ...

export default function DailyOpsPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const [data, setData] = useState<any>(null)

  // Cross-filter integration
  const { crossFilters, exportCrossFilters, importCrossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])

  // Sync cross-filters with current filters
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

  // Handler for loading a preset
  const handleLoadPreset = useCallback(
    (filters: Record<string, any>, crossFilters: any[]) => {
      setCurrentFilters(filters)
      importCrossFilters(crossFilters)
    },
    [importCrossFilters]
  )

  // ... rest of your data fetching logic ...

  return (
    <AnalyticsPageLayout
      title="Daily Ops Report (CS)"
      showExport={true}
      contentRef={contentRef}
    >
      {/* Filter Preset Manager */}
      <FilterPresetManager
        page="daily-ops"
        currentFilters={currentFilters}
        currentCrossFilters={exportCrossFilters()}
        onLoadPreset={handleLoadPreset}
      />

      {/* Filter Panel */}
      <MetadataFilterPanel
        filterFields={['team', 'pic', 'rev_flag']}
        onFilterChange={setCurrentFilters}
        isLoading={loading}
      />

      {/* Your metrics, charts, tables, etc. */}
      {/* ... */}
    </AnalyticsPageLayout>
  )
}
```

---

## 🎨 Features You Get

### 1. Save Current Filters
- Click "Save As"
- Give it a name
- Optionally set as default
- Done!

### 2. Load Saved Filters
- Click dropdown
- Select preset
- Filters apply instantly

### 3. Update Filters
- Load a preset
- Change filters
- See "Unsaved changes" warning
- Click "Update" to save

### 4. Share with Team
- Click ⋮ menu next to preset
- Select "Share"
- Enter teammate's email
- Choose "View Only" or "Can Edit"
- They can now use your preset!

### 5. Set Default
- Click ⋮ menu
- Select "Set as default"
- Star (⭐) appears
- Loads automatically next time

---

## 🔧 Troubleshooting

### "Cannot find module '@/lib/types/filterPreset'"
Make sure the file exists:
```
lib/types/filterPreset.ts
```

### "CrossFilterContext does not have exportCrossFilters"
The context was updated. Restart your dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Preset dropdown not showing
1. Check browser console for errors
2. Verify database migration ran successfully
3. Check that user is authenticated

### Cannot save preset - "Unauthorized"
Make sure you're logged in and the auth token is valid.

---

## 📚 More Information

- **Full Integration Guide:** `FILTER_PRESETS_INTEGRATION_GUIDE.md`
- **Implementation Details:** `FILTER_PRESETS_IMPLEMENTATION_SUMMARY.md`
- **Database Schema:** `supabase/migrations/20250104_create_filter_presets.sql`

---

## 💡 Tips

1. **Name presets clearly** - "Weekly APP_GV" is better than "Filter 1"
2. **Add descriptions** - Helps teammates understand what the preset is for
3. **Use defaults wisely** - Only set frequently used presets as default
4. **Share strategically** - Share common filters with your team
5. **Update vs Save As** - Update to modify, Save As to create a variation

---

## ✅ Done!

You now have a working filter presets feature on your analytics page.

Repeat Step 2 for other pages:
- `deep-dive` → 'deep-dive'
- `publisher-summary` → 'publisher-summary'
- `business-health` → 'business-health'
- etc.

Each page gets its own set of presets automatically!
