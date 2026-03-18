# Phase 2: Notification System - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a complete notification system with persistent in-app notifications and email delivery. This enables the grading workflow (Leaders notified → grade → Manager approved → publish → Users notified). Database tables, API endpoints, UI components, and email service all need to be built from scratch.

**Key decision:** Both in-app AND email notifications with independent preferences per channel.
</domain>

<decisions>
## Implementation Decisions

### 1. Notification Storage & Database Schema

**Event Linking:** Store rich references (challenge_id, submission_id, etc.) so users can navigate directly to the source event. Notifications are not self-contained messages — they link to the domain entities that triggered them.

**Retention Policy:** Soft + hard delete approach
- Dismissed flag for user-initiated dismissals (soft delete)
- Read notifications auto-hard-deleted after 90 days
- Unread notifications kept indefinitely until dismissed
- Admin can manually purge if needed

**Notification Types:** Type-based classification with visual distinction
- `urgent` — Needs immediate action (e.g., approval required)
- `info` — Informational updates (e.g., scores published)
- `success` — Completed actions (e.g., grades approved)
Each type gets distinct icon and color in the UI.

**Grouping:** Hybrid expandable approach
- Similar notifications grouped by default (e.g., "5 submissions need grading")
- User can expand group to see individual items
- Each item can be clicked/dismissed individually
- Group dismiss marks all items as read

### 2. Email Delivery Strategy

**SMTP Service:** Deferred choice — implement Nodemailer service structure without committing to a specific provider. Use environment variables for SMTP config (host, port, user, pass). Admin can configure Gmail SMTP, SendGrid, Mailgun, etc. later.

**Email Templates:** Basic HTML with inline styles
- Simple HTML templates with Tailwind-like inline styles
- No external template library dependency
- Responsive design for mobile
- Plain text fallback generated from HTML

**Delivery Mode:** Asynchronous with retry logic
- Background queue/worker for email sending
- User gets immediate API response (don't wait for email)
- Retry up to 3 times with exponential backoff (1s, 4s, 16s)
- Log failures after final retry

**Error Handling:** Retry then log
- Invalid email addresses → log, skip
- SMTP timeout/down → retry with backoff
- Final failure → log to `notification_delivery_errors` table
- No user-facing errors (email is best-effort)

### 3. UI/UX for Notifications

**Bell Location:** Left of UserDropdown in header
- Placed between logo area and user avatar
- Consistent placement on desktop and mobile
- Visible on all authenticated pages

**Unread Badge:** Number badge on bell icon
- Red circular badge with exact count (e.g., "3")
- Hidden when count is 0
- Updates in real-time via polling or SSE

**Click Action:** Dropdown panel (GitHub/LinkedIn style)
- Dropdown with scrollable list of notifications
- Shows 10 most recent, link to view all
- Click outside or ESC to close
- Loading state while fetching

**Item Click:** Navigate + mark read
- Single click navigates to relevant page (challenge, grading, etc.)
- Automatically marks as read when clicked
- Dropdown closes after navigation
- Group expand shows items without navigating

### 4. Notification Preferences

**Granularity:** By category with independent channel control
- Categories: Challenges, Bible, System, Team
- Each category has separate Email ON/OFF and In-app ON/OFF toggles
- Example: User can have Challenge emails OFF but in-app ON

**Default Settings:** Role-based defaults
- **Admin/Manager:** All channels ON for all categories (they need visibility)
- **Leader:** Challenges in-app ON, email ON; other categories in-app ON, email OFF
- **Member:** Challenges in-app ON, email OFF; other categories mixed
- New users get defaults based on initial role

**Preferences UI:** Dedicated settings page
- Route: `/settings/notifications`
- Grouped by category (Challenges, Bible, System, Team)
- Toggle switches for Email / In-app per category
- Save button to persist changes
- "Reset to defaults" button

**Channel Control:** Independent toggles
- Email and in-app preferences are completely independent
- User can have email ON but in-app OFF (or vice versa)
- Notification service checks both preferences before sending
- If both OFF, notification is not created at all

### 5. Notification Service Architecture

**Database Tables:**
```sql
-- notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('urgent', 'info', 'success')),
  category TEXT NOT NULL CHECK (category IN ('challenge', 'bible', 'system', 'team')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- { challenge_id, submission_id, etc. }
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  email_enabled JSONB DEFAULT '{"challenge": true, "bible": true, "system": true, "team": true}',
  inapp_enabled JSONB DEFAULT '{"challenge": true, "bible": true, "system": true, "team": true}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notification_delivery_errors table (for failed emails)
CREATE TABLE notification_delivery_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  error_type TEXT NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /api/notifications` — List user notifications (paginated)
- `PATCH /api/notifications/:id/read` — Mark as read
- `POST /api/notifications/mark-all-read` — Bulk mark as read
- `DELETE /api/notifications/:id` — Dismiss notification
- `GET /api/notifications/unread-count` — Get unread count for badge
- `GET /api/notifications/preferences` — Get user preferences
- `PUT /api/notifications/preferences` — Update preferences

**Email Service:**
- Location: `apps/web/lib/services/notificationEmailService.ts`
- Function: `sendNotificationEmail(to, notification, preferences)`
- Uses Nodemailer with SMTP from env vars
- Async execution with retry logic
- Template renderer for HTML email body

**Notification Triggers (Workflow Integration):**
- Challenge status → "grading": Notify Leaders (in-app + email)
- Leader grades submitted: Notify Managers (in-app + email)
- Manager approves/rejects: Notify Leaders (in-app + email)
- Leaderboard published: Notify all Users (in-app only, email opt-in)

### 6. Claude's Discretion

- Exact polling interval for unread count (suggest 30s or SSE)
- Dropdown panel animation and transition timing
- Notification grouping algorithm (how similar is "similar"?)
- Email template visual design (match brand colors)
- Retry backoff strategy details
- Whether to use a queue library or simple setTimeout

</decisions>

<specifics>
## Specific Ideas

- Nodemailer is already installed (v7.0.10) — no new dependencies needed
- Toast notifications exist (use-toast.ts) but are ephemeral — don't confuse with persistent notifications
- Challenge grading workflow has API endpoints at `/api/challenges/[id]/grading` — integrate notification triggers there
- UserDropdown component exists — good reference for header UI patterns
- Role system (admin, manager, leader, member) drives default preferences
- Phase 3 (Manager Approval) depends on this notification system being functional

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` §Phase 2 — Phase goal, requirements (NOTIF-01 to NOTIF-13), success criteria
- `.planning/REQUIREMENTS.md` §Phase 2 — Detailed requirements for notification system

### Project context
- `.planning/PROJECT.md` — Core value, constraints, existing capabilities
- `.planning/STATE.md` — Current progress, technical notes

### Phase 1 context
- `.planning/phases/01-foundation-admin-unification/01-CONTEXT.md` — Admin structure, shared components, route patterns

### Codebase patterns
- `.planning/codebase/STRUCTURE.md` — Where to place new code
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import order, error handling
- `.planning/codebase/ARCHITECTURE.md` — Layers, data flow, context providers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Nodemailer installed**: `nodemailer@7.0.10` with `@types/nodemailer@7.0.3` — ready to use
- **Toast system**: `hooks/use-toast.ts` — ephemeral UI feedback, don't confuse with persistent notifications
- **Header structure**: `components/layout/Header.tsx` — UserDropdown placement, responsive patterns
- **UserDropdown**: `components/shared/UserDropdown.tsx` — reference for header menu UI patterns
- **Admin components**: `components/admin/` — AdminTable, AdminForm, AdminDialog (from Phase 1)

### Established Patterns
- **API routes**: `app/api/` with RESTful organization, auth checks via `getServerUser()`
- **Database types**: `lib/supabase/database.types.ts` — add notification tables here
- **Service layer**: `lib/services/` — existing services show patterns for Supabase queries
- **TanStack Query**: Used for data fetching — notification list should use this
- **Error handling**: Try-catch with logging prefix `[Notification Service]`

### Integration Points
- **Grading API**: `app/api/challenges/[id]/grading/route.ts` — trigger notifications on grading events
- **Submissions API**: `app/api/challenges/[id]/submissions/route.ts` — trigger on submission
- **Auth context**: `app/contexts/AuthContext.tsx` — get current user for notification queries
- **Middleware**: `middleware.ts` — route protection for settings page

### What's Missing (to be built)
- Database tables: `notifications`, `notification_preferences`, `notification_delivery_errors`
- API endpoints: 7 notification endpoints (list, read, mark-all, dismiss, count, preferences)
- Email service: `lib/services/notificationEmailService.ts` with Nodemailer
- Email templates: HTML templates for each notification type
- UI components: NotificationBell, NotificationDropdown, NotificationPreferences page
- Notification service: `lib/services/notificationService.ts` for creating/triggering notifications

</code_context>

<deferred>
## Deferred Ideas

- Real-time notifications via WebSocket/SSE — use polling for now
- Notification scheduling/delayed sending — send immediately in Phase 2
- Rich notification attachments (images, files) — text only for now
- Notification muting (snooze) — dismiss/read only for now
- Admin notification center (view all users' notifications) — Phase 4
- Notification analytics (open rates, click rates) — Phase 4

</deferred>

---

*Phase: 02-notification-system*
*Context gathered: 2026-03-18*
