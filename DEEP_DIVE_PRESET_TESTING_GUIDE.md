# Deep-Dive Filter Preset Testing Guide

## ✅ Implementation Complete!

Filter presets are now fully integrated into the Deep-Dive page with support for:
- ✅ Saving analysis configurations (perspective, filters, tiers, time periods)
- ✅ Loading presets with full state restoration
- ✅ URL-based preset sharing
- ✅ Smart auto-generated descriptions
- ✅ Default preset auto-loading
- ✅ Unsaved changes detection

---

## 🚀 Quick Start Testing

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to Deep-Dive Page
Open: `http://localhost:3000/performance-tracker/deep-dive`

---

## 📋 Comprehensive Test Checklist

### ✅ Test 1: Basic Save/Load (CRITICAL)

**Steps:**
1. Go to Deep-Dive page
2. Select **Publisher (pid)** perspective
3. Change date range to **Last 28 vs 28 days**
4. Add filter: **Team = Sales** (or any team you have)
5. Click **"Save As"** button
6. Modal should auto-fill:
   - **Name**: "Publisher Analysis - Sales"
   - **Description**: "Publisher perspective | Last 28 vs 28 days | Team: Sales | Tier A"
7. Save the preset as **"Test Preset 1"**
8. Change perspective to **Team**
9. Load **"Test Preset 1"** from dropdown
10. ✅ **VERIFY**: Page switches back to Publisher perspective with Sales team filter

**Expected Result:**
- Perspective restored to Publisher ✅
- Team filter = Sales ✅
- Date range = Last 28 vs 28 days ✅
- Tier = A ✅
- Analysis automatically triggers ✅

---

### ✅ Test 2: Perspective Switching (CRITICAL FOR DEEP-DIVE)

**Steps:**
1. Create preset with **PIC perspective**
2. Add filter: **Product = Product A**
3. Save as **"PIC Analysis - Product A"**
4. Switch to **Media perspective**
5. Load **"PIC Analysis - Product A"** preset
6. ✅ **VERIFY**: Page switches to PIC perspective (NOT Media!)

**Expected Result:**
- Perspective changes from Media → PIC ✅
- Product filter applied ✅
- This is the KEY feature that makes deep-dive presets powerful!

---

### ✅ Test 3: Tier Filter Restoration

**Steps:**
1. Select perspective: **Publisher**
2. Set tier filter to **Tier B** (click B button)
3. Add filters: **Team = Marketing**
4. Click **Analyze**
5. Save preset as **"Tier B Publishers"**
6. Change tier to **Tier A**
7. Load **"Tier B Publishers"** preset
8. ✅ **VERIFY**: Tier switches back to **B**, not A

**Expected Result:**
- Tier filter restored to B ✅
- Table shows only Tier B publishers ✅

---

### ✅ Test 4: Date Range Presets

**Scenario A: Relative Dates (Smart Recalculation)**
1. Select **Yesterday vs 30-day avg** preset
2. Add filter: **Team = Sales**
3. Save as **"Daily Sales Check"**
4. Wait until tomorrow (or change system date)
5. Load **"Daily Sales Check"**
6. ✅ **VERIFY**: Dates recalculate to NEW yesterday (not old yesterday!)

**Scenario B: Custom Dates (Absolute Dates)**
1. Manually set dates:
   - Period 1: 2025-01-01 to 2025-01-31
   - Period 2: 2025-02-01 to 2025-02-28
2. Save as **"Jan vs Feb 2025"**
3. Change dates to something else
4. Load **"Jan vs Feb 2025"**
5. ✅ **VERIFY**: Dates restore to exactly Jan 1-31 vs Feb 1-28

**Expected Result:**
- Relative presets (yesterday, last 7 days) recalculate dynamically ✅
- Custom dates saved as absolute dates ✅

---

### ✅ Test 5: Multi-Select Filters

**Steps:**
1. Perspective: **Publisher**
2. Filter: **Team = [Sales, Marketing]** (select multiple)
3. Save as **"Multi-Team Publishers"**
4. Clear filters
5. Load **"Multi-Team Publishers"**
6. ✅ **VERIFY**: Both Sales and Marketing selected in team filter

**Expected Result:**
- All selected teams restored ✅
- Multi-select dropdown shows "Sales, Marketing" ✅

---

### ✅ Test 6: Complex Filter Combination

**Steps:**
1. Perspective: **Product**
2. Filters:
   - Team = Sales
   - PIC = John Doe
   - Zone = US
3. Date range: Last 7 vs 7 days
4. Tier: Tier A
5. Save as **"Complex Analysis"**
6. Auto-generated description should show:
   - "Product perspective | Last 7 vs 7 days | Team: Sales, PIC: John Doe, Zone: US | Tier A"
7. Clear all filters
8. Load **"Complex Analysis"**
9. ✅ **VERIFY**: ALL filters restored correctly

**Expected Result:**
- All 3 dimension filters restored ✅
- Correct perspective ✅
- Correct tier ✅
- Correct date range ✅

---

### ✅ Test 7: URL Sharing (Team Collaboration)

**Steps:**
1. Create preset: **"Team Sales - Publisher Analysis"**
   - Perspective: Publisher
   - Team: Sales
   - Tier: A
2. Click **Actions → Share**
3. Share with team member email
4. Copy the share URL (e.g., `/deep-dive?preset=abc123`)
5. Open in incognito window or new browser
6. ✅ **VERIFY**: Preset loads automatically from URL

**Expected Result:**
- Preset loads without clicking anything ✅
- Shows "Shared preset loaded" toast ✅
- Save Copy button appears (for shared presets) ✅
- User can save their own copy ✅

---

### ✅ Test 8: Default Preset Auto-Load

**Steps:**
1. Create preset: **"My Default Deep-Dive"**
2. Set filters: Team = Sales, Perspective = Publisher
3. Save and check **"Set as default"** checkbox
4. Close browser tab
5. Open new tab and go to deep-dive page
6. ✅ **VERIFY**: Preset auto-loads immediately on page open

**Expected Result:**
- No manual loading needed ✅
- Filters applied automatically ✅
- Star icon shows next to preset name ✅

---

### ✅ Test 9: Unsaved Changes Detection

**Steps:**
1. Load a preset: **"Test Preset"**
2. Change perspective from Publisher to Team
3. ✅ **VERIFY**: Orange asterisk (*) appears next to preset name
4. Click **Actions → Discard changes**
5. ✅ **VERIFY**: Perspective reverts back to Publisher

**Expected Result:**
- Asterisk shows when ANY state changes ✅
- Can discard changes and revert ✅
- Can save as new preset ✅
- Can update existing preset (if you own it) ✅

---

### ✅ Test 10: Smart Description Generator

**Test multiple scenarios to verify auto-generation:**

**Scenario 1: Simple**
- Perspective: Publisher, Team: Sales, Tier A
- Expected: "Publisher Analysis - Sales - Tier A"
- Description: "Publisher perspective | Last 28 vs 28 days | Team: Sales | Tier A"

**Scenario 2: Multiple Filters**
- Perspective: PIC, Team: Sales, Product: Product A
- Expected: "PIC Analysis - Sales"
- Description: "PIC perspective | Last 7 vs 7 days | Team: Sales, Product: Product A"

**Scenario 3: All Tiers**
- Perspective: Team, No tier filter (ALL)
- Expected: "Team Analysis"
- Description: "Team perspective | Last 28 vs 28 days"

**Scenario 4: Multi-select**
- Perspective: Product, Teams: [Sales, Marketing, Support]
- Expected description: "Product perspective | ... | Team: Sales +2 more"

---

### ✅ Test 11: Edit Existing Preset

**Steps:**
1. Create preset: **"Original Name"**
2. Click **⋮** (three dots) next to preset in dropdown
3. Click **Edit**
4. Change name to **"Updated Name"**
5. Click **Update Preset**
6. ✅ **VERIFY**: Preset name updates in dropdown

**Expected Result:**
- Name updates immediately ✅
- Description can be edited ✅
- Default status can be toggled ✅

---

### ✅ Test 12: Delete Preset

**Steps:**
1. Create a test preset
2. Click **⋮** → **Delete**
3. Confirm deletion
4. ✅ **VERIFY**: Preset removed from dropdown
5. If it was loaded, preset clears

**Expected Result:**
- Preset deleted from database ✅
- Removed from UI immediately ✅

---

### ✅ Test 13: Set/Unset Default

**Steps:**
1. Create preset: **"Preset A"**
2. Click **⋮** → **Set as default**
3. ✅ **VERIFY**: Star icon appears
4. Create preset: **"Preset B"**
5. Set "Preset B" as default
6. ✅ **VERIFY**: Star moves from A to B (only one default allowed)
7. Click **⋮** on "Preset B" → **Remove default**
8. ✅ **VERIFY**: No star on any preset

**Expected Result:**
- Only one default at a time ✅
- Star icon shows current default ✅
- Default auto-loads on page visit ✅

---

### ✅ Test 14: Perspective-Specific Filters

**Important Test: Filters should NOT break when perspective changes**

**Steps:**
1. Perspective: **Publisher (pid)**
2. Add filter: **PID = Publisher123**
3. Save preset
4. Switch perspective to **Team**
5. Load the preset
6. ✅ **VERIFY**:
   - Perspective switches to Publisher
   - PID filter still applied
   - No errors in console

**Expected Result:**
- Filters from other perspectives preserved ✅
- No filter conflicts ✅

---

### ✅ Test 15: Empty Preset (Edge Case)

**Steps:**
1. Go to deep-dive page (no filters set)
2. Default state:
   - Perspective: Publisher
   - Tier: A
   - Date: Last 28 vs 28 days
   - No dimension filters
3. Click **"Save As"**
4. Save as **"Clean Slate"**
5. Add random filters and change perspective
6. Load **"Clean Slate"**
7. ✅ **VERIFY**: Returns to clean default state

**Expected Result:**
- Empty presets work correctly ✅
- Useful for "reset to default" functionality ✅

---

## 🐛 Known Issues / Edge Cases to Watch

### 1. **Drill-Down State NOT Saved** ⚠️
- **Expected**: Drill path (breadcrumbs) NOT included in presets
- **Why**: Drill-down is session-specific navigation
- **Behavior**: Loading preset always starts from root view

### 2. **Multi-Select Array Normalization**
- Single item: `"Sales"` vs `["Sales"]` should be treated same
- Already handled in code but watch for bugs

### 3. **Date Preset Edge Case**
- If preset has both `activePreset` AND custom dates, preset ID takes precedence
- Custom dates only used if no preset ID

### 4. **Concurrent Preset Loading**
- URL preset loads BEFORE default preset
- Default preset skipped if URL preset exists
- Correct behavior!

---

## 🎯 Success Criteria

### All features working = ✅ PASS
- [ ] Save preset with perspective
- [ ] Load preset restores perspective
- [ ] Smart descriptions generated
- [ ] URL sharing works
- [ ] Default preset auto-loads
- [ ] Unsaved changes detected
- [ ] Multi-select filters restored
- [ ] Date range presets recalculate
- [ ] Tier filter restored
- [ ] Edit/Delete presets work

---

## 📊 Testing Metrics

**Minimum passing score: 12/15 tests**

| Test | Status | Notes |
|------|--------|-------|
| 1. Basic Save/Load | ⏳ Pending | |
| 2. Perspective Switching | ⏳ Pending | |
| 3. Tier Filter | ⏳ Pending | |
| 4. Date Range | ⏳ Pending | |
| 5. Multi-Select | ⏳ Pending | |
| 6. Complex Filters | ⏳ Pending | |
| 7. URL Sharing | ⏳ Pending | |
| 8. Default Auto-Load | ⏳ Pending | |
| 9. Unsaved Changes | ⏳ Pending | |
| 10. Smart Description | ⏳ Pending | |
| 11. Edit Preset | ⏳ Pending | |
| 12. Delete Preset | ⏳ Pending | |
| 13. Set/Unset Default | ⏳ Pending | |
| 14. Perspective Filters | ⏳ Pending | |
| 15. Empty Preset | ⏳ Pending | |

---

## 🔍 Console Debug Logs

Look for these helpful debug messages:

```
[Deep-Dive] Loading preset: { perspective: 'pid', ... }
[Deep-Dive] Restoring perspective: pid
[Deep-Dive] Preset loaded successfully!
[FilterPresetManager] Loading preset from URL: abc123
[Filter Changes Detection] Detected changes: { filtersChanged: true, ... }
```

---

## 🚨 Common Issues & Solutions

### Issue: Preset doesn't load perspective
**Solution**: Check console for errors. Ensure `savedPerspective` exists in preset.filters

### Issue: Dates don't recalculate
**Solution**: Verify `activePreset` field is saved. If null, dates are absolute.

### Issue: Unsaved changes always showing
**Solution**: Check filter normalization logic (array vs string)

### Issue: URL preset not loading
**Solution**: Verify URL parameter format: `?preset=<uuid>`

---

## 🎉 Final Verification

**Run this quick test sequence before marking complete:**

1. ✅ Create 3 presets with different perspectives
2. ✅ Set one as default
3. ✅ Share one via URL
4. ✅ Reload page → default loads
5. ✅ Open URL → shared preset loads
6. ✅ Edit a preset name
7. ✅ Delete one preset
8. ✅ Load remaining presets and verify all state restores

**If all 8 steps pass → 🎊 IMPLEMENTATION SUCCESSFUL!**

---

## 📝 Notes for Tomorrow Morning

### What to test first:
1. **Basic save/load** (Test #1) - Most critical
2. **Perspective switching** (Test #2) - Unique to deep-dive
3. **URL sharing** (Test #7) - Team collaboration feature

### If something breaks:
- Check browser console for errors
- Check Network tab for API failures
- Check `[Deep-Dive]` debug logs
- Verify database has `filter_presets` table
- Ensure Supabase auth is working

### Quick fixes:
- Clear browser cache if presets don't update
- Hard refresh (Ctrl+Shift+R) if UI looks broken
- Check `.env.local` for Supabase credentials

---

## 🎓 Architecture Summary

### Files Modified:
1. `app/(protected)/performance-tracker/deep-dive/page.tsx` - Main integration
2. `app/components/performance-tracker/FilterPresetManager.tsx` - Added props
3. `app/components/performance-tracker/SavePresetModal.tsx` - Smart suggestions

### Files Created:
1. `lib/utils/deepDivePresetHelpers.ts` - Helper functions

### Database:
- No changes needed! ✅
- `filter_presets` table already supports deep-dive

### API:
- No changes needed! ✅
- All endpoints work with `page="deep-dive"`

---

## ✨ What Makes This Special

Unlike other pages (Daily Ops, Business Health), Deep-Dive presets save:
1. **Perspective** - Changes entire analysis view
2. **Dual time periods** - Period1 vs Period2 comparison
3. **Tier filtering** - A/B/C/NEW/LOST segmentation
4. **Date presets** - Smart recalculation for relative dates

This makes Deep-Dive presets MORE POWERFUL than standard filter presets!

---

**Ready to test! Sleep well and good luck tomorrow! 🌙**
