# Requirements: MC Bible & Knowledge Championship

**Defined:** 2026-03-18
**Updated:** 2026-03-18 (6-phase expansion)
**Core Value:** MC team can learn, track progress, and compete in knowledge challenges.

## v1 Requirements

Requirements for completing the MC Bible and Knowledge Championship features for internal team training.

---

## Phase 1: Admin Unification Requirements

Foundational work to consolidate duplicate admin interfaces and create shared patterns.

### Admin Unification

- [x] **ADM-01**: Unified admin interface for both Bible and Challenges management
- [x] **ADM-02**: Consistent admin navigation and patterns across all admin panels
- [x] **ADM-03**: Shared admin components (forms, tables, dialogs) for reuse
- [x] **ADM-04**: Consolidate `apps/admin` into `apps/web` (eliminate duplicate app)
- [x] **ADM-05**: Delete duplicate UI components and services
- [x] **ADM-06**: Create shared admin layout/sidebar component

---

## Phase 2: Notification System Requirements

Enable communication for the grading workflow with in-app and email notifications.

### In-App Notifications

- [x] **NOTIF-01**: In-app notification system with persistent notifications in database
- [x] **NOTIF-02**: Notification list endpoint showing all user notifications
- [x] **NOTIF-03**: Mark notification as read functionality
- [x] **NOTIF-04**: Unread notification count indicator

### Email Notifications

- [x] **NOTIF-05**: Email notification service using Nodemailer
- [x] **NOTIF-06**: Email templates for notification types
- [x] **NOTIF-07**: SMTP configuration for email delivery

### Notification Preferences

- [x] **NOTIF-08**: User notification preferences (email vs in-app per notification type)
- [x] **NOTIF-09**: Notification preferences management UI

### Workflow Triggers

- [x] **NOTIF-10**: Notification when challenge status changes to "grading" (to Leaders)
- [x] **NOTIF-11**: Notification when Leader submits grades for approval (to Managers)
- [x] **NOTIF-12**: Notification when Manager approves grades (to Leaders)
- [x] **NOTIF-13**: Notification when scores are published (to Users)

---

## Phase 3: Manager Approval Workflow Requirements

Implement the complete grading workflow with Leader → Manager approval stages.

### Database Schema

- [x] **APPR-01**: `approval_status` field on challenge_submissions (pending_approval, approved, rejected)
- [x] **APPR-02**: `approvals` table for audit trail (who approved what when)
- [ ] **APPR-03**: `approval_notes` field for manager feedback

### API Endpoints

- [x] **APPR-04**: API endpoint for Leader to submit grades for approval
- [x] **APPR-05**: API endpoint for Manager to approve grades
- [x] **APPR-06**: API endpoint for Manager to reject grades with notes
- [x] **APPR-07**: API endpoint to list pending approvals

### User Interface

- [ ] **APPR-08**: Leader UI: "Submit for Approval" button in grading interface
- [ ] **APPR-09**: Manager UI: Approval queue showing pending submissions
- [ ] **APPR-10**: Manager UI: Review submission with grades displayed
- [ ] **APPR-11**: Manager UI: Approve/Reject buttons with notes field

### Workflow Rules

- [ ] **APPR-12**: Leaderboard publishing blocked until Manager approval
- [x] **APPR-13**: Audit trail for all approval actions (timestamp, user, action)
- [x] **APPR-14**: Notification sent to Leader on Manager approval/rejection

---

## Phase 4: Admin Dashboard + Monitoring Requirements

Provide visibility and control for admins through centralized dashboard.

### Overview Dashboard

- [ ] **DASH-01**: Overview dashboard showing all admin areas at a glance
- [ ] **DASH-02**: Quick stats cards (active challenges, pending approvals, training completion)
- [ ] **DASH-03**: Recent activity feed

### Training Monitoring

- [ ] **DASH-04**: Training completion monitoring by team
- [ ] **DASH-05**: Bible progress overview (paths, articles, completion rates)
- [ ] **DASH-06**: User training status detail view

### Grading Status

- [ ] **DASH-07**: Grading status view (pending approvals, completed grading)
- [ ] **DASH-08**: Leader grading progress tracking
- [ ] **DASH-09**: Manager approval queue widget

### AI Cost Monitoring

- [ ] **DASH-10**: AI cost monitoring dashboard
- [ ] **DASH-11**: Cost breakdown by feature (challenges, bible, etc.)
- [ ] **DASH-12**: Cost alerts and limits

### User & Role Management

- [ ] **DASH-13**: User management interface (list, add, edit users)
- [ ] **DASH-14**: Role assignment interface
- [ ] **DASH-15**: Team assignment interface

### Quick Actions

- [ ] **DASH-16**: Quick action buttons from dashboard (publish scores, send reminders)
- [ ] **DASH-17**: Bulk actions for common admin tasks

---

## Phase 5: MC Bible Completion Requirements

Complete the learning platform with missing content types and integration.

### Bible Admin

- [ ] **BIBL-01**: Dedicated admin panel for Bible content management
- [ ] **BIBL-02**: Role-based permissions for who can create/edit paths and articles
- [ ] **BIBL-03**: Admin can create and edit learning paths (title, description, icon, color)
- [ ] **BIBL-04**: Admin can create and edit articles with rich text content
- [ ] **BIBL-05**: Admin can upload file attachments to articles
- [ ] **BIBL-06**: Admin can reorder articles within a learning path

### Bible Learning Features

- [ ] **BIBL-07**: User can view all learning paths with progress indicators
- [ ] **BIBL-08**: User can view articles within a learning path
- [ ] **BIBL-09**: User can mark articles as complete (progress tracking)
- [ ] **BIBL-10**: User sees progress bar showing path completion percentage
- [ ] **BIBL-11**: Search within articles to find specific content
- [ ] **BIBL-12**: Table of contents navigation for long articles
- [ ] **BIBL-13**: Required vs optional article tracking (completion calculation)
- [ ] **BIBL-14**: Sections/categories within learning paths for organization

### Slides/Presentations Support

- [ ] **BIBL-15**: Slides content type in Bible articles
- [ ] **BIBL-16**: Slide deck URL field (Google Slides, PowerPoint Online)
- [ ] **BIBL-17**: Slide display component with navigation
- [ ] **BIBL-18**: Slide embed integration (iframe or viewer)

### Completion & Recognition

- [ ] **BIBL-19**: Completion certificates generated upon path completion
- [ ] **BIBL-20**: Certificates include user name, path name, completion date
- [ ] **BIBL-21**: User can download certificate as PDF

### Quiz Integration

- [ ] **INTG-01**: Articles can have embedded quiz questions
- [ ] **INTG-02**: Quiz completion contributes to article completion status
- [ ] **INTG-03**: Challenge questions can reference Bible articles
- [ ] **INTG-04**: Bible article links from challenge questions

---

## Phase 6: Advanced Features Requirements

Add scalability, analytics, and polish features.

### Challenge Auto-Grading

- [ ] **CHAL-01**: Automated grading for cloze (fill-in-blank) questions
- [ ] **CHAL-02**: Automated grading for drag-drop questions
- [ ] **CHAL-03**: Instant feedback shown after objective question submission
- [ ] **CHAL-04**: Auto-graded questions display score immediately
- [ ] **CHAL-05**: Support for partial credit in cloze questions

### Question Management

- [ ] **CHAL-06**: Question bank/pool system with tagging
- [ ] **CHAL-07**: Random selection from question pools for challenges
- [ ] **CHAL-08**: Question reuse across multiple challenges
- [ ] **CHAL-09**: Question difficulty rating system
- [ ] **CHAL-10**: Question filtering by difficulty and tags

### Results & Analytics

- [ ] **CHAL-11**: Individual results page showing detailed performance
- [ ] **CHAL-12**: Results page shows score per question and overall score
- [ ] **CHAL-13**: Performance analytics over time (per user)
- [ ] **CHAL-14**: Team performance analytics and comparison
- [ ] **CHAL-15**: Comparative rankings and improvement tracking
- [ ] **CHAL-16**: Historical submission history per user

---

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Analytics

- **ANLY-01**: Learning paths effectiveness tracking
- **ANLY-02**: Knowledge gap identification based on quiz performance
- **ANLY-03**: AI-powered content recommendations
- **ANLY-04**: Time spent per article analytics

### Social Features

- **SOCF-01**: Comments and discussions on articles
- **SOCF-02**: User-to-user knowledge sharing
- **SOCF-03**: Peer rating system for articles

### Gamification

- **GAMF-01**: Points system for learning activities
- **GAMF-02**: Achievement badges beyond certificates
- **GAMF-03**: Learning streaks tracking
- **GAMF-04**: Level progression system

---

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile apps | Web-first, mobile-responsive design is sufficient for internal use |
| Payment gateways | Internal platform, no course sales or monetization |
| Course marketplace | Not a public LMS, admin-controlled content only |
| SCORM/xAPI compliance | Internal platform doesn't need LMS industry standards |
| Multi-tenancy | Single organization (MC team) with role-based access |
| Live proctoring | Internal trust-based environment, honor system sufficient |
| Video hosting | Use existing solutions (YouTube, Vimeo) via embed URLs |
| Advanced AI recommendations | Manual curation is appropriate for internal training |
| Public-facing content | All content is internal to MC team only |

---

## Traceability

Which phases cover which requirements.

### Phase 1: Admin Unification (6 requirements)
| Requirement | Status |
|-------------|--------|
| ADM-01 | Complete ✅ |
| ADM-02 | Complete ✅ |
| ADM-03 | Complete ✅ |
| ADM-04 | Complete ✅ |
| ADM-05 | Complete ✅ |
| ADM-06 | Complete ✅ |

### Phase 2: Notification System (13 requirements)
| Requirement | Status |
|-------------|--------|
| NOTIF-01 | Complete (02-01) |
| NOTIF-02 | Complete (02-04) |
| NOTIF-03 | Pending |
| NOTIF-04 | Complete (02-04) |
| NOTIF-05 | Pending |
| NOTIF-06 | Pending |
| NOTIF-07 | Pending |
| NOTIF-08 | Pending |
| NOTIF-09 | Pending |
| NOTIF-10 | Pending |
| NOTIF-11 | Pending |
| NOTIF-12 | Pending |
| NOTIF-13 | Pending |

### Phase 3: Manager Approval Workflow (14 requirements)
| Requirement | Status |
|-------------|--------|
| APPR-01 | Pending |
| APPR-02 | Pending |
| APPR-03 | Pending |
| APPR-04 | Pending |
| APPR-05 | Pending |
| APPR-06 | Pending |
| APPR-07 | Pending |
| APPR-08 | Pending |
| APPR-09 | Pending |
| APPR-10 | Pending |
| APPR-11 | Pending |
| APPR-12 | Pending |
| APPR-13 | Pending |
| APPR-14 | Pending |

### Phase 4: Admin Dashboard (17 requirements)
| Requirement | Status |
|-------------|--------|
| DASH-01 | Pending |
| DASH-02 | Pending |
| DASH-03 | Pending |
| DASH-04 | Pending |
| DASH-05 | Pending |
| DASH-06 | Pending |
| DASH-07 | Pending |
| DASH-08 | Pending |
| DASH-09 | Pending |
| DASH-10 | Pending |
| DASH-11 | Pending |
| DASH-12 | Pending |
| DASH-13 | Pending |
| DASH-14 | Pending |
| DASH-15 | Pending |
| DASH-16 | Pending |
| DASH-17 | Pending |

### Phase 5: MC Bible Completion (25 requirements)
| Requirement | Status |
|-------------|--------|
| BIBL-01 | Pending |
| BIBL-02 | Pending |
| BIBL-03 | Pending |
| BIBL-04 | Pending |
| BIBL-05 | Pending |
| BIBL-06 | Pending |
| BIBL-07 | Pending |
| BIBL-08 | Pending |
| BIBL-09 | Pending |
| BIBL-10 | Pending |
| BIBL-11 | Pending |
| BIBL-12 | Pending |
| BIBL-13 | Pending |
| BIBL-14 | Pending |
| BIBL-15 | Pending |
| BIBL-16 | Pending |
| BIBL-17 | Pending |
| BIBL-18 | Pending |
| BIBL-19 | Pending |
| BIBL-20 | Pending |
| BIBL-21 | Pending |
| INTG-01 | Pending |
| INTG-02 | Pending |
| INTG-03 | Pending |
| INTG-04 | Pending |

### Phase 6: Advanced Features (16 requirements)
| Requirement | Status |
|-------------|--------|
| CHAL-01 | Pending |
| CHAL-02 | Pending |
| CHAL-03 | Pending |
| CHAL-04 | Pending |
| CHAL-05 | Pending |
| CHAL-06 | Pending |
| CHAL-07 | Pending |
| CHAL-08 | Pending |
| CHAL-09 | Pending |
| CHAL-10 | Pending |
| CHAL-11 | Pending |
| CHAL-12 | Pending |
| CHAL-13 | Pending |
| CHAL-14 | Pending |
| CHAL-15 | Pending |
| CHAL-16 | Pending |

**Coverage:**
- v1 requirements: 91 total
- Mapped to phases: 91
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 (6-phase expansion)*
