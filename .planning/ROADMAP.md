# Roadmap: MC Bible & Knowledge Championship

**Created:** 2026-03-18
**Updated:** 2026-03-18 (Phase 1 plans created)
**Granularity:** Coarse (aggressive compression)
**Phases:** 6
**Coverage:** 91 requirements

## Phases

- [X] **Phase 1: Foundation + Admin Unification** - Consolidate duplicate admin apps, unified admin structure ✅
- [ ] **Phase 2: Notification System** - In-app and email notifications for grading workflow
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

**Plans:** TBD

---

### Phase 3: Manager Approval Workflow

**Goal:** Implement the complete grading workflow with approval stages.

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

**Plans:** TBD

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
| 1. Foundation + Admin Unification | 0/3 | Ready to execute | - |
| 2. Notification System | 0/13 | Not started | - |
| 3. Manager Approval Workflow | 0/14 | Not started | - |
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
| ADM-01 | 01-02 | Pending |
| ADM-02 | 01-02 | Pending |
| ADM-03 | 01-01 | Pending |
| ADM-04 | 01-03 | Pending |
| ADM-05 | 01-03 | Pending |
| ADM-06 | 01-02 | Pending |

### Notification System (Phase 2)
| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTIF-01 | Phase 2 | Pending |
| NOTIF-02 | Phase 2 | Pending |
| NOTIF-03 | Phase 2 | Pending |
| NOTIF-04 | Phase 2 | Pending |
| NOTIF-05 | Phase 2 | Pending |
| NOTIF-06 | Phase 2 | Pending |
| NOTIF-07 | Phase 2 | Pending |
| NOTIF-08 | Phase 2 | Pending |
| NOTIF-09 | Phase 2 | Pending |
| NOTIF-10 | Phase 2 | Pending |
| NOTIF-11 | Phase 2 | Pending |
| NOTIF-12 | Phase 2 | Pending |
| NOTIF-13 | Phase 2 | Pending |

### Manager Approval Workflow (Phase 3)
| Requirement | Phase | Status |
|-------------|-------|--------|
| APPR-01 | Phase 3 | Pending |
| APPR-02 | Phase 3 | Pending |
| APPR-03 | Phase 3 | Pending |
| APPR-04 | Phase 3 | Pending |
| APPR-05 | Phase 3 | Pending |
| APPR-06 | Phase 3 | Pending |
| APPR-07 | Phase 3 | Pending |
| APPR-08 | Phase 3 | Pending |
| APPR-09 | Phase 3 | Pending |
| APPR-10 | Phase 3 | Pending |
| APPR-11 | Phase 3 | Pending |
| APPR-12 | Phase 3 | Pending |
| APPR-13 | Phase 3 | Pending |
| APPR-14 | Phase 3 | Pending |

### Admin Dashboard (Phase 4)
| Requirement | Phase | Status |
|-------------|-------|--------|
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
| Requirement | Phase | Status |
|-------------|-------|--------|
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
| Requirement | Phase | Status |
|-------------|-------|--------|
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
*Last updated: 2026-03-18 (Phase 1 plans created)*
