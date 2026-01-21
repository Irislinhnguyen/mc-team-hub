# Team Management System - Setup Guide

## Overview

This document describes the new Team Management system that replaces hardcoded team assignments with a dynamic, UI-based configuration stored in Supabase.

## Architecture

**Database:** Supabase (PostgreSQL)
**Why Supabase?** Fast reads with caching, real-time updates, designed for CRUD operations
**BigQuery:** Still used only for analytics data (revenue, PICs, products, zones)

## What Was Built

### 1. Database Schema (Supabase)

Three tables to manage team configurations:

- **`team_configurations`** - Defines teams (WEB_GTI, WEB_GV, APP)
- **`team_pic_mappings`** - Maps PICs to teams (1 PIC = 1 team max)
- **`team_product_patterns`** - Fallback pattern matching for unassigned PICs

### 2. Backend Services

**File:** `lib/utils/teamMatcher.ts`
- Fetches team configs from Supabase with 5-minute cache
- Builds dynamic SQL WHERE conditions for team filters
- Replaces hardcoded logic in analytics queries

**Updated:** `lib/services/analyticsQueries.ts`
- `buildWhereClause()` now async, uses `teamMatcher` utility
- No more hardcoded team patterns

**API Routes:**
- `GET /api/teams` - Get all teams with PICs
- `POST /api/teams/assign` - Assign PIC to team
- `POST /api/teams/unassign` - Remove PIC from team
- `POST /api/teams/unassigned-pics` - Get unassigned PICs

### 3. Frontend UI

**New Page:** `/analytics/team-setup`
- Drag-and-drop interface using @dnd-kit
- 3 team columns + unassigned pool
- Search functionality for PICs
- Real-time updates
- Auto-saves on drag

**Components Created:**
- `TeamColumn.tsx` - Droppable zone for teams
- `PicCard.tsx` - Draggable PIC card
- `UnassignedPool.tsx` - Pool for unassigned PICs

**Updated:** `AnalyticsSidebar.tsx`
- Added "Team Setup" link with Settings icon

## Setup Instructions

### Step 1: Run Database Migration

You need to create the tables in Supabase. Choose one method:

#### Option A: Supabase Dashboard (Easiest)
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy entire contents of `supabase/migrations/20250130_create_team_management.sql`
5. Paste into SQL Editor
6. Click **Run**

#### Option B: Supabase CLI
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Run migration
supabase db push
```

#### Option C: Direct PostgreSQL
```bash
psql -h db.lvzzmcwsrmpzkdpkllnu.supabase.co -U postgres -d postgres < supabase/migrations/20250130_create_team_management.sql
```

### Step 2: Verify Migration

After running migration, verify tables were created:

1. Go to Supabase Dashboard > Table Editor
2. You should see 3 new tables:
   - `team_configurations` (3 rows: WEB_GTI, WEB_GV, APP)
   - `team_pic_mappings` (5 rows: pre-populated based on analysis)
   - `team_product_patterns` (5 rows: fallback patterns)

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Access Team Setup Page

Navigate to: http://localhost:3000/analytics/team-setup

You should see:
- 3 team columns (WEB_GTI, WEB_GV, APP)
- Pre-assigned PICs:
  - **APP team:** VN_minhlh, VN_anhtn, VN_hang
  - **WEB_GV team:** VN_ngocth, VN_ngantt
- Unassigned pool with remaining PICs

## How It Works

### Team Filter Flow

**Before (Hardcoded):**
```typescript
if (team === 'APP') return `product LIKE 'app_%'`
```

**After (Dynamic):**
```typescript
// 1. Fetch team config from Supabase (cached 5 min)
const config = await getTeamConfigurations()

// 2. Build SQL condition based on PIC assignments
const teamPics = config.picMappings
  .filter(m => m.team_id === 'APP')
  .map(m => m.pic_name)
// → ['VN_minhlh', 'VN_anhtn', 'VN_hang']

// 3. Generate SQL
return `pic IN ('VN_minhlh', 'VN_anhtn', 'VN_hang')`
```

### Drag-and-Drop Flow

1. **User drags VN_minhlh from APP to WEB_GV**
2. Frontend calls `POST /api/teams/assign`
   - Body: `{ picName: 'VN_minhlh', teamId: 'WEB_GV' }`
3. Backend deletes old assignment, inserts new one
4. Cache is cleared (`clearTeamConfigCache()`)
5. Next analytics query fetches fresh config
6. VN_minhlh's data now appears in WEB_GV filter

## Default Assignments

Based on BigQuery analysis, the migration pre-populates:

### APP Team (100% app revenue PICs)
- VN_minhlh
- VN_anhtn
- VN_hang

### WEB_GV Team (100% web revenue PICs)
- VN_ngocth
- VN_ngantt

### WEB_GTI Team
- (Empty by default, uses pattern fallback: `pic LIKE 'ID_%'`)

## Pattern Fallbacks

For PICs not explicitly assigned, the system uses product patterns:

| Team | Pattern | Type | Priority |
|------|---------|------|----------|
| WEB_GTI | `ID_%` | STARTS_WITH | 1 |
| WEB_GTI | `id_%` | STARTS_WITH | 1 |
| WEB_GV | `VN_%` | STARTS_WITH | 2 |
| WEB_GV | `vn_%` | STARTS_WITH | 2 |
| APP | `app_%` | STARTS_WITH | 3 |

**Priority:** Explicit PIC assignments > Product patterns

## Benefits

1. **No code changes needed** - Leaders can manage teams via UI
2. **Accurate filtering** - Each PIC explicitly assigned based on actual data
3. **Fast performance** - 5-minute cache minimizes database queries
4. **Scalable** - Add new team members by dragging in UI
5. **Flexible** - Can reassign PICs when responsibilities change

## Testing Checklist

After setup, verify:

- [ ] Navigate to `/analytics/team-setup` - page loads without errors
- [ ] See 3 team columns + unassigned pool
- [ ] Drag a PIC from unassigned to APP team - saves successfully
- [ ] Drag that PIC from APP to WEB_GV - updates correctly
- [ ] Drag that PIC to unassigned pool - removes from team
- [ ] Go to `/analytics/business-health`
- [ ] Select APP in team filter - see correct data
- [ ] Select multiple teams (APP + WEB_GV) - see combined data
- [ ] Refresh page - assignments persist

## Troubleshooting

### Error: "Failed to load team configurations"
- Check Supabase migration ran successfully
- Verify tables exist in Supabase Dashboard
- Check console for specific error

### Error: "Failed to assign PIC to team"
- Check RLS policies are enabled
- Verify you're authenticated
- Check browser console for detailed error

### Team filter shows no data
- Clear cache: restart dev server
- Check BigQuery has data for that PIC
- Verify PIC name matches exactly (case-sensitive)

### PICs not showing in unassigned pool
- Check that BigQuery query ran successfully
- Open browser DevTools > Network tab > Check API responses

## Files Modified/Created

### Created:
- `supabase/migrations/20250130_create_team_management.sql`
- `lib/utils/teamMatcher.ts`
- `lib/supabase/database.types.ts` (updated)
- `app/api/teams/route.ts`
- `app/api/teams/assign/route.ts`
- `app/api/teams/unassign/route.ts`
- `app/api/teams/unassigned-pics/route.ts`
- `app/(protected)/analytics/team-setup/page.tsx`
- `app/components/analytics/TeamColumn.tsx`
- `app/components/analytics/PicCard.tsx`
- `app/components/analytics/UnassignedPool.tsx`
- `scripts/run-migration.mjs`

### Modified:
- `lib/services/analyticsQueries.ts` (made async, uses teamMatcher)
- `app/api/analytics/business-health-filtered/route.ts` (await buildWhereClause)
- `app/components/analytics/AnalyticsSidebar.tsx` (added Team Setup link)

### Packages Added:
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## Cache Management

The system uses a 5-minute cache for team configurations. To force refresh:

```typescript
import { clearTeamConfigCache } from '../lib/utils/teamMatcher'

clearTeamConfigCache() // Clears cache, next query fetches fresh data
```

Cache is automatically cleared after any assignment change.

## Security

- **RLS Enabled:** All tables have Row Level Security
- **Authenticated users only:** Can read/modify team assignments
- **Unique constraint:** Each PIC can only belong to one team
- **Service role key:** Required for server-side operations

## Next Steps

1. Run the migration (see Step 1 above)
2. Test the Team Setup page
3. Verify analytics filters work with new assignments
4. Train team leaders on how to use drag-and-drop UI
5. Monitor performance and adjust cache duration if needed

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs (`npm run dev` output)
3. Verify Supabase tables and data
4. Review this documentation

---

**Last Updated:** 2025-01-30
**Version:** 1.0
