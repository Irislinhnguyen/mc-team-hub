# Roadmap: MC Bible & Knowledge Championship

**Created:** 2026-03-18
**Updated:** 2026-03-18 (Phase 3 revised)
**Granularity:** Coarse (aggressive compression)
**Phases:** 6
**Coverage:** 91 requirements

## Phases

- [X] **Phase 1: Foundation + Admin Unification** - Consolidate duplicate admin apps, unified admin structure ✅
- [X] **Phase 2: Notification System** - In-app and email notifications for grading workflow (completed 2026-03-18)
- [ ] **Phase 3: Manager Approval Workflow** - Leader grades → Manager approves → Publish enabled
- [ ] **Phase 4: Admin Dashboard + Monitoring** - Overview dashboard, training completion, AI cost monitoring
- [ ] **Phase 5: MC Bible Completion** - Slides support, quiz integration, search, certificates
- [ ] **Phase 6: Advanced Features** - Question pools, analytics, historical tracking

## Phase Details

### Phase 1: Foundation + Admin Unification

**Goal:** Stop multiplying tech debt by consolidating duplicate admin apps into a unified system.

**Depends on:** Nothing (foundation phase)

**Requirements:**
- ADM-01: Unified admin interface for both Bible and Challenges management
- ADM-02: Consistent admin navigation and patterns across all admin panels
- ADM-03: Shared admin components (forms, tables, dialogs) for reuse
- ADM-04: Consolidate `apps/admin` into `apps/web` (eliminate duplicate app)
- ADM-05: Delete duplicate UI components and services
- ADM-06: Create shared admin layout/sidebar component

**Success Criteria:**
1. Single admin interface exists (no more apps/admin)
2. Shared components can be imported across admin features
3. Duplicate code eliminated
4. Admin navigation is consistent

**Plans:** 3 plans in 3 waves ✅ Complete

- [X] 01-01-PLAN.md — Create shared admin components (Wave 1) ✅
  - ADM-03: AdminTable, AdminForm, AdminDialog, AdminHeader components
  - 4 tasks: Create AdminTable, AdminForm, AdminDialog, AdminHeader with barrel export
  - All components use @/components/ui/* imports (not @query-stream-ai/ui/*)

- [X] 01-02-PLAN.md — Unify admin layout and sidebar (Wave 2) ✅
  - ADM-01, ADM-02, ADM-06: AdminSidebar with 7 navigation items, unified layout
  - 3 tasks: Update AdminSidebar, verify admin layout auth, create overview placeholder
  - Includes navigation for Phase 4 (Overview) and Phase 5 (Bible admin)

- [X] 01-03-PLAN.md — Delete duplicate apps/admin directory (Wave 3) ✅
  - ADM-04, ADM-05: Delete apps/admin, merge env configs, update build configs
  - 7 tasks: Merge env vars, remove from workspaces, update turbo.json/vercel.json, verify imports, delete directory, verify build
  - Result: Single Vercel project, 50% cost reduction

---

### Phase 2: Notification System

**Goal:** Enable communication for the grading workflow.

**Depends on:** Phase 1 (uses unified admin structure)

**Requirements:**
- NOTIF-01: In-app notification system with persistent notifications
- NOTIF-02: Email notification service (Nodemailer implementation)
- NOTIF-03: Notification preferences per user
- NOTIF-04: Notification when challenge status changes to "grading" (Leaders)
- NOTIF-05: Notification when grading complete (Managers)
- NOTIF-06: Notification when scores published (Users)
- NOTIF-07: Notification API endpoints (list, mark read, preferences)
- NOTIF-08: Notification templates for different event types

**Success Criteria:**
1. Leaders receive notifications when submissions need grading
2. Managers receive notifications when approval is needed
3. Users receive notifications when scores are published
4. Users can manage notification preferences (email vs in-app)

**Plans:** 6/6 plans complete ✅

- [X] 02-01-PLAN.md — Database + Core Service (Wave 1) ✅
  - NOTIF-01, NOTIF-08: Database tables (notifications, notification_preferences, notification_delivery_errors), TypeScript types, notification service
  - 3 tasks: Create migration, update database types, create notification service
  - Role-based default preferences (admin/manager all on, leader mixed, member minimal)

- [X] 02-02-PLAN.md — Email Service (Wave 1) ✅
  - NOTIF-05, NOTIF-06, NOTIF-07: Nodemailer service with SMTP, HTML email templates, env configuration
  - 3 tasks: Create email templates, create email service with retry logic, update .env.example
  - SMTP env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME

- [X] 02-03-PLAN.md — API Endpoints (Wave 2) ✅
  - NOTIF-02, NOTIF-03, NOTIF-04: RESTful API for notification operations
  - 6 tasks: GET /api/notifications, DELETE /api/notifications/:id, PATCH /api/notifications/:id/read, POST /api/notifications/mark-all-read, GET /api/notifications/unread-count, GET/PUT /api/notifications/preferences
  - All endpoints require authentication via getServerUser()

- [X] 02-04-PLAN.md — UI Components (Wave 2) ✅
  - NOTIF-01, NOTIF-02: Notification bell with badge, dropdown panel
  - 4 tasks: Create NotificationBell, create NotificationDropdown, create barrel export, update Header
  - Bell placed between logo and UserDropdown, 30s polling for unread count

- [X] 02-05-PLAN.md — Preferences UI (Wave 3) ✅
  - NOTIF-08, NOTIF-09: Settings page for notification preferences
  - 1 task: Create /settings/notifications page with category toggles
  - 4 categories (Challenges, Bible, System, Team) with email/in-app switches

- [X] 02-06-PLAN.md — Workflow Integration (Wave 3) ✅
  - NOTIF-10, NOTIF-11, NOTIF-12, NOTIF-13: Trigger notifications on grading events
  - 2 tasks: Create workflow notification service, integrate into grading API
  - Functions: notifyLeadersGradingStarted, notifyManagersGradesSubmitted, notifyLeadersGradeApproved, notifyUsersScoresPublished

---

### Phase 3: Manager Approval Workflow

**Goal:** Implement the complete grading workflow with Leader → Manager approval stages.

**Depends on:** Phase 1 (admin structure), Phase 2 (notifications)

**Requirements:**
- APPR-01: Database: Approval status tracking for submissions
- APPR-02: API: Leader submits grades to Manager
- APPR-03: API: Manager approves/rejects grades with notes
- APPR-04: UI: Manager review interface for grading
- APPR-05: UI: Approval queue showing pending submissions
- APPR-06: Workflow: Leader grades → Manager approves → Publish enabled
- APPR-07: Audit trail for all approval actions

**Success Criteria:**
1. Leaders can submit grades to Manager for approval
2. Managers can review, adjust, and approve grades
3. Leaderboard publishing is blocked until Manager approval
4. Full audit trail of who did what when

**Plans:** 2/8 plans executed

- [ ] 03-00-PLAN.md — Test Infrastructure (Wave 0) ⏳
  - E2E tests and auth fixtures for approval workflow
  - 2 tasks: Create auth fixtures (setupManagerTest, setupLeaderTest), generate E2E test file (approvals.spec.ts with 8+ test cases)
  - Tests will run after implementation is complete

- [ ] 03-01-PLAN.md — Database + Types (Wave 1) ⏳
  - APPR-01, APPR-02, APPR-13: Extend submission status enum with pending_review and approved, create approvals audit table
  - 3 tasks: Create migration with new statuses and approvals table, regenerate TypeScript types, apply migration to Supabase (human checkpoint)
  - RLS policies for approvals: everyone can read, Leader/Manager/Admin can create, no deletes

- [ ] 03-02-PLAN.md — Leader Submit API + Pending Approvals API (Wave 2) ⏳
  - APPR-04, APPR-07, APPR-14: POST endpoint for Leader to submit grades, GET endpoint for Manager to list pending approvals, GET endpoint for approval history
  - 3 tasks: Create submit-for-review API, create pending approvals list API, create approval history API
  - Notification integration: notifyManagersGradesSubmitted on submit

- [ ] 03-03-PLAN.md — Manager Approve/Edit API (Wave 2) ⏳
  - APPR-05, APPR-06, APPR-14: POST endpoint for Manager to approve submission, PATCH endpoint for Manager to edit grades
  - 2 tasks: Create approve API with Leader notification, create edit grades API with tracking
  - Grade edits track Manager via grading_modified_by and grading_modified_at

- [ ] 03-04-PLAN.md — Leader Submit UI (Wave 3) ⏳
  - APPR-08: SubmitForReviewButton component, bulk submit in grading interface
  - 3 tasks: Create SubmitForReviewButton component, create barrel export, integrate into grading page
  - Button shows Submitted state after submission, status badges display current state

- [ ] 03-05a-PLAN.md — Approval Queue Components (Wave 4) ⏳
  - APPR-09, APPR-10: ApprovalQueueTable and ApproveButton components
  - 3 tasks: Create ApprovalQueueTable component, create ApproveButton component, update barrel export
  - Components are building blocks for the approvals page

- [ ] 03-05b-PLAN.md — Approval Queue Page + Detail View (Wave 5) ⏳
  - APPR-11: ApprovalDetailView, approvals page, AdminSidebar navigation
  - 5 tasks: Create ApprovalDetailView component, update barrel export, create approvals queue page, add Approvals link to AdminSidebar, human verification checkpoint
  - Page integrates ApprovalQueueTable and ApprovalDetailView, provides filter controls and next/prev navigation

- [ ] 03-06-PLAN.md — Publish Validation + Notifications (Wave 6) ⏳
  - APPR-12, APPR-13, APPR-14: Modify publish API to enforce Manager approval before publishing
  - 2 tasks: Add approval validation to publish API, verify end-to-end workflow (human checkpoint)
  - Publish requires Manager/Admin role and approved status, triggers user notifications

---

### Phase 4: Admin Dashboard + Monitoring

**Goal:** Provide visibility and control for admins.

**Depends on:** Phase 1 (admin structure), Phase 2 (notifications), Phase 3 (approval workflow data)

**Requirements:**
- DASH-01: Overview dashboard showing all admin areas
- DASH-02: Training completion monitoring (Bible progress by team)
- DASH-03: Grading status view (pending approvals, completed grading)
- DASH-04: AI cost monitoring dashboard
- DASH-05: User and role management interface
- DASH-06: Quick actions from dashboard (publish scores, send reminders)

**Success Criteria:**
1. Admin sees overview of all system areas at login
2. Admin can drill down into specific areas (training, grading, users)
3. Admin can monitor AI spending
4. Admin can take quick actions from dashboard

**Plans:** TBD

---

### Phase 5: MC Bible Completion

**Goal:** Complete the learning platform with missing content types and integration.

**Depends on:** Phase 1 (admin structure), Phase 4 (monitoring data)

**Requirements:**
- BIBL-01: Dedicated admin panel for Bible content management
- BIBL-02: Role-based permissions for who can create/edit paths and articles
- BIBL-03: Admin can create and edit learning paths (title, description, icon, color)
- BIBL-04: Admin can create and edit articles with rich text content
- BIBL-05: Admin can upload file attachments to articles
- BIBL-06: Admin can reorder articles within a learning path
- BIBL-07: User can view all learning paths with progress indicators
- BIBL-08: User can view articles within a learning path
- BIBL-09: User can mark articles as complete (progress tracking)
- BIBL-10: User sees progress bar showing path completion percentage
- BIBL-11: Search within articles
- BIBL-12: Table of contents navigation
- BIBL-13: Required vs optional article tracking
- BIBL-14: Sections/categories within paths
- BIBL-15: Completion certificates (jsPDF)
- BIBL-16: Slides/presentations support
- BIBL-17: Quiz-article integration
- INTG-01: Articles can have embedded quiz questions
- INTG-02: Quiz completion contributes to article completion
- INTG-03: Challenge questions can reference Bible articles

**Success Criteria:**
1. Admin can create slide decks in Bible
2. Quizzes can be embedded in articles
3. Users receive certificates upon path completion
4. Users can search Bible content
5. Articles have table of contents navigation

**Plans:** TBD

---

### Phase 6: Advanced Features

**Goal:** Add scalability, analytics, and polish.

**Depends on:** Phase 3 (grading data), Phase 4 (monitoring), Phase 5 (Bible content)

**Requirements:**
- CHAL-01: Automated grading for cloze (fill-in-blank) questions
- CHAL-02: Automated grading for drag-drop questions
- CHAL-03: Instant feedback shown after objective question submission
- CHAL-04: Auto-graded questions display score immediately
- CHAL-05: Support for partial credit in cloze questions
- CHAL-06: Question bank/pool system with tagging
- CHAL-07: Random selection from question pools
- CHAL-08: Question reuse across multiple challenges
- CHAL-09: Question difficulty rating system
- CHAL-10: Question filtering by difficulty and tags
- CHAL-11: Individual results page (detailed performance)
- CHAL-12: Performance analytics over time
- CHAL-13: Team performance analytics
- CHAL-14: Comparative rankings
- CHAL-15: Historical submission tracking

**Success Criteria:**
1. Questions can be organized into pools and reused
2. Challenges randomly select from pools
3. Users see detailed performance analytics
4. Managers see team comparisons and trends

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Admin Unification | 3/3 | Complete | 2026-03-18 |
| 2. Notification System | 6/6 | Complete   | 2026-03-18 |
| 3. Manager Approval Workflow | 2/8 | In Progress|  |
| 4. Admin Dashboard + Monitoring | 0/17 | Not started | - |
| 5. MC Bible Completion | 0/25 | Not started | - |
| 6. Advanced Features | 0/16 | Not started | - |

---

## Dependencies

```
Phase 1: Foundation + Admin Unification (NO DEPENDENCIES)
    ↓
Phase 2: Notification System (needs unified admin)
    ↓
Phase 3: Manager Approval (needs notifications + unified admin)
    ↓
Phase 4: Admin Dashboard (needs approval workflow data + notifications)
    ↓
Phase 5: MC Bible Completion (needs admin structure + monitoring)
    ↓
Phase 6: Advanced Features (needs data from all previous phases)
```

**Key dependency notes:**
- Phase 1 is the foundation - all other phases depend on it
- Phase 2 (notifications) enables Phase 3 (approval workflow)
- Phase 3 (approval data) feeds Phase 4 (dashboard monitoring)
- Phase 5 (Bible) and Phase 6 (Advanced features) build on all previous foundations
- Each phase delivers user-facing value immediately

---

## Coverage Summary

### Admin Unification (Phase 1)
| Requirement | Plan | Status |
|-------------|------|--------|
| ADM-01 | 01-02 | Complete ✅ |
| ADM-02 | 01-02 | Complete ✅ |
| ADM-03 | 01-01 | Complete ✅ |
| ADM-04 | 01-03 | Complete ✅ |
| ADM-05 | 01-03 | Complete ✅ |
| ADM-06 | 01-02 | Complete ✅ |

### Notification System (Phase 2)
| Requirement | Plan | Status |
|-------------|------|--------|
| NOTIF-01 | 02-01, 02-04 | Complete ✅ |
| NOTIF-02 | 02-03 | Complete ✅ |
| NOTIF-03 | 02-03 | Complete ✅ |
| NOTIF-04 | 02-03 | Complete ✅ |
| NOTIF-05 | 02-02 | Complete ✅ |
| NOTIF-06 | 02-02 | Complete ✅ |
| NOTIF-07 | 02-02 | Complete ✅ |
| NOTIF-08 | 02-01, 02-05 | Complete ✅ |
| NOTIF-09 | 02-05 | Complete ✅ |
| NOTIF-10 | 02-06 | Complete ✅ |
| NOTIF-11 | 02-06 | Complete ✅ |
| NOTIF-12 | 02-06 | Complete ✅ |
| NOTIF-13 | 02-06 | Complete ✅ |

### Manager Approval Workflow (Phase 3)
| Requirement | Plan | Status |
|-------------|------|--------|
| APPR-01 | 03-01 | Pending |
| APPR-02 | 03-01, 03-02 | Pending |
| APPR-03 | N/A | Out of scope (no rejection workflow) |
| APPR-04 | 03-02 | Pending |
| APPR-05 | 03-03 | Pending |
| APPR-06 | 03-03 | Out of scope (no rejection workflow) |
| APPR-07 | 03-02 | Pending |
| APPR-08 | 03-04 | Pending |
| APPR-09 | 03-05a | Pending |
| APPR-10 | 03-05a | Pending |
| APPR-11 | 03-05b | Pending |
| APPR-12 | 03-06 | Pending |
| APPR-13 | 03-01, 03-06 | Pending |
| APPR-14 | 03-02, 03-03, 03-06 | Pending |

### Admin Dashboard (Phase 4)
| Requirement | Plan | Status |
|-------------|------|--------|
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| DASH-07 | Phase 4 | Pending |
| DASH-08 | Phase 4 | Pending |
| DASH-09 | Phase 4 | Pending |
| DASH-10 | Phase 4 | Pending |
| DASH-11 | Phase 4 | Pending |
| DASH-12 | Phase 4 | Pending |
| DASH-13 | Phase 4 | Pending |
| DASH-14 | Phase 4 | Pending |
| DASH-15 | Phase 4 | Pending |
| DASH-16 | Phase 4 | Pending |
| DASH-17 | Phase 4 | Pending |

### MC Bible Completion (Phase 5)
| Requirement | Plan | Status |
|-------------|------|--------|
| BIBL-01 | Phase 5 | Pending |
| BIBL-02 | Phase 5 | Pending |
| BIBL-03 | Phase 5 | Pending |
| BIBL-04 | Phase 5 | Pending |
| BIBL-05 | Phase 5 | Pending |
| BIBL-06 | Phase 5 | Pending |
| BIBL-07 | Phase 5 | Pending |
| BIBL-08 | Phase 5 | Pending |
| BIBL-09 | Phase 5 | Pending |
| BIBL-10 | Phase 5 | Pending |
| BIBL-11 | Phase 5 | Pending |
| BIBL-12 | Phase 5 | Pending |
| BIBL-13 | Phase 5 | Pending |
| BIBL-14 | Phase 5 | Pending |
| BIBL-15 | Phase 5 | Pending |
| BIBL-16 | Phase 5 | Pending |
| BIBL-17 | Phase 5 | Pending |
| BIBL-18 | Phase 5 | Pending |
| BIBL-19 | Phase 5 | Pending |
| BIBL-20 | Phase 5 | Pending |
| BIBL-21 | Phase 5 | Pending |
| INTG-01 | Phase 5 | Pending |
| INTG-02 | Phase 5 | Pending |
| INTG-03 | Phase 5 | Pending |
| INTG-04 | Phase 5 | Pending |

### Advanced Features (Phase 6)
| Requirement | Plan | Status |
|-------------|------|--------|
| CHAL-01 | Phase 6 | Pending |
| CHAL-02 | Phase 6 | Pending |
| CHAL-03 | Phase 6 | Pending |
| CHAL-04 | Phase 6 | Pending |
| CHAL-05 | Phase 6 | Pending |
| CHAL-06 | Phase 6 | Pending |
| CHAL-07 | Phase 6 | Pending |
| CHAL-08 | Phase 6 | Pending |
| CHAL-09 | Phase 6 | Pending |
| CHAL-10 | Phase 6 | Pending |
| CHAL-11 | Phase 6 | Pending |
| CHAL-12 | Phase 6 | Pending |
| CHAL-13 | Phase 6 | Pending |
| CHAL-14 | Phase 6 | Pending |
| CHAL-15 | Phase 6 | Pending |
| CHAL-16 | Phase 6 | Pending |

**Total v1 requirements:** 91
**Mapped to phases:** 91
**Unmapped:** 0 ✓

---

*Roadmap created: 2026-03-18*
*Last updated: 2026-03-18 (Phase 3 revised - 8 plans in 7 waves)*
