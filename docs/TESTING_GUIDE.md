# Sales Lists Feature - Testing Guide

## Prerequisites

1. Database migration applied successfully
2. Application running locally
3. Authenticated user session

## Step 1: Apply Database Migration

### Option A: Supabase Dashboard
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/20250208_create_sales_lists.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run"
7. Verify tables created in Table Editor

### Option B: Manual Commands
```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'sales_%';

-- Should return:
-- sales_lists
-- sales_list_items
-- sales_list_activities
-- sales_list_shares
```

## Step 2: Access the Feature

1. Start your development server
2. Login to the application
3. Check sidebar navigation - you should see "Sales Lists" option
4. Click "Sales Lists" to navigate to `/sales-lists`

## Step 3: Test Basic Flow

### Create a List
1. Click "New List" button
2. Enter name: "Test Outreach Q4"
3. Enter description: "Testing sales tracking feature"
4. Select a color (default is blue)
5. Click "Create List"
6. Verify toast notification appears
7. Verify list card appears in overview

Expected result: List card shows:
- List name and description
- Color indicator
- 0 items, 0 contacts
- Today's date

### View List Detail
1. Click on the list card
2. Should navigate to `/sales-lists/[id]`
3. Verify header shows list name, description, color bar
4. Verify 4 stat cards showing 0s
5. Verify empty state message

### Add an Item
1. Click "Add Items" button
2. Select item type: "Domain / App ID"
3. Enter item value: "com.example.game"
4. Enter display name: "Example Game"
5. Add notes: "Test publisher from research"
6. Click "Add Item"
7. Verify toast notification
8. Verify item appears in table

Expected result: Table row shows:
- Publisher: "Example Game"
- Item value: "com.example.game"
- Status: "Contacted" (gray badge)
- 0 contacts
- No last activity yet
- "View" button

### Log First Activity
1. Click on the item row (or "View" button)
2. Drawer slides in from right
3. Verify item details in header
4. Click "Log Activity" button
5. Fill form:
   - Activity Type: Contact
   - Contact Time: (auto-filled, can edit)
   - Contact Type: Initial Contact
   - Notes: "Sent initial email via Gmail"
6. Click "Log Activity"
7. Verify toast notification
8. Verify activity appears in timeline

Expected result:
- Activity card shows icon, type, timestamp
- Contact time displayed
- Notes visible
- "by [your-email]" shown
- Delete button visible

### Log Response Activity
1. In the same item drawer, click "Log Activity" again
2. Fill form:
   - Activity Type: Response
   - Contact Time: (set to 1 hour after first contact)
   - Response Type: Positive
   - Response Time: (auto-fills to contact time)
   - Notes: "Customer expressed interest in Q4 campaign"
3. Click "Log Activity"
4. Verify new activity in timeline
5. Verify status badge changed to "Positive" (green)

### Log Retarget Activity
1. Click "Log Activity" again
2. Fill form:
   - Activity Type: Contact
   - Contact Type: Retarget
   - Notes: "Follow-up call per customer request"
3. Click "Log Activity"
4. Verify timeline shows retarget
5. Close drawer
6. Verify table shows "1 retarget" in orange

### Close Deal
1. Click item to open drawer
2. Click "Log Activity"
3. Fill form:
   - Activity Type: Response
   - Response Type: Positive
   - Deal Status: Closed Won
   - Deal Value: 50000
   - Notes: "Deal signed, 1-year contract"
4. Click "Log Activity"
5. Verify status changed to "Won" (green)
6. Close drawer
7. Go back to lists overview
8. Verify list card shows "1 Won"

## Step 4: Test Edit/Delete

### Edit List
1. In list detail page, click three-dot menu
2. Click "Edit List"
3. Change name to "Test Outreach Q4 - Updated"
4. Change color
5. Click "Save Changes"
6. Verify changes reflected

### Delete Activity
1. Open item drawer
2. Hover over an activity
3. Click trash icon
4. Confirm deletion
5. Verify activity removed from timeline

### Delete List
1. Click three-dot menu
2. Click "Delete List"
3. Review warning dialog
4. Verify item count shown
5. Click "Delete List"
6. Verify redirected to overview
7. Verify list no longer appears

## Step 5: Test Multiple Items

1. Create a new list
2. Add 5 different items
3. Log various activities for each:
   - Item 1: Contact → Positive → Won
   - Item 2: Contact → Negative
   - Item 3: Contact → Retarget → Positive
   - Item 4: Contact → Retarget → Retarget (3rd retarget - should show warning)
   - Item 5: Contact only (no response)
4. Verify stats update correctly
5. Verify warnings appear for over-contacted items

## Step 6: Test Data Persistence

1. Refresh the page
2. Navigate away and back
3. Verify all data persists
4. Check that activities remain in correct order
5. Verify stats are accurate

## Common Issues & Solutions

### Issue: Tables not found
**Solution**: Migration not applied. Run SQL migration file.

### Issue: 401 Unauthorized
**Solution**: Authentication issue. Check cookie `__Host-auth_token` exists.

### Issue: 403 Forbidden
**Solution**: RLS policies not working. Verify user_id in users table matches auth.uid().

### Issue: Items not appearing
**Solution**: Check browser console for errors. Verify API response.

### Issue: Activities not saving
**Solution**: Check CSRF token is being sent. Verify logged_by user_id exists.

## API Testing (Optional)

### Test with curl:

```bash
# Get lists
curl http://localhost:3000/api/sales-lists \
  -H "Cookie: __Host-auth_token=your-token"

# Create list
curl -X POST http://localhost:3000/api/sales-lists \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-auth_token=your-token" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{"name":"API Test List","color":"#1565C0"}'

# Add item
curl -X POST http://localhost:3000/api/sales-lists/LIST_ID/items \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-auth_token=your-token" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{"items":[{"item_type":"domain","item_value":"test.com","source":"manual"}]}'

# Log activity
curl -X POST http://localhost:3000/api/sales-lists/LIST_ID/items/ITEM_ID/activities \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-auth_token=your-token" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{"list_item_id":"ITEM_ID","activity_type":"contact","contact_outcome":"contacted"}'
```

## Success Criteria

Feature is working correctly when:
- Lists can be created, edited, deleted
- Items can be added manually
- Activities can be logged with all fields
- Timeline displays activities in chronological order
- Stats update correctly in real-time
- Status badges show correct colors
- Retarget warnings appear at 3+ retargets
- Navigation works smoothly
- Data persists across page refreshes
- No console errors
- Toast notifications appear for all actions

## Performance Checks

- List overview loads in < 1 second
- List detail page loads in < 1 second
- Activity drawer opens instantly
- Modal forms are responsive
- No lag when scrolling timeline
- Table handles 50+ items smoothly

## Browser Testing

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsive

- Sidebar collapses properly
- Modals fit on mobile screens
- Tables scroll horizontally
- Touch interactions work
- Drawer slides smoothly

## Next Steps After Testing

1. If share functionality needed: Implement user lookup endpoint
2. If CSV import needed: Add CSV parsing and bulk insert
3. If analytics dashboard needed: Create charts and metrics page
4. If GCPP Check integration needed: Add checkbox column to DataTable
5. If export needed: Add CSV/PDF export functionality

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Console errors (screenshot)
3. Network tab (failed requests)
4. Steps to reproduce
5. Expected vs actual behavior
6. Database state (if relevant)
