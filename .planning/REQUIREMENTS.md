# Requirements: MC Bible & Knowledge Championship

**Defined:** 2026-03-18
**Core Value:** MC team can learn, track progress, and compete in knowledge challenges.

## v1 Requirements

Requirements for completing the MC Bible and Knowledge Championship features for internal team training.

### Admin Unification

Foundational work to consolidate duplicate admin interfaces and create shared patterns.

- [ ] **ADM-01**: Unified admin interface for both Bible and Challenges management
- [ ] **ADM-02**: Consistent admin navigation and patterns across all admin panels
- [ ] **ADM-03**: Shared admin components (forms, tables, dialogs) for reuse

### Bible Admin

Admin capabilities for managing MC Bible learning content.

- [ ] **BIBL-01**: Dedicated admin panel for Bible content management
- [ ] **BIBL-02**: Role-based permissions for who can create/edit paths and articles
- [ ] **BIBL-03**: Admin can create and edit learning paths (title, description, icon, color)
- [ ] **BIBL-04**: Admin can create and edit articles with rich text content
- [ ] **BIBL-05**: Admin can upload file attachments to articles
- [ ] **BIBL-06**: Admin can reorder articles within a learning path

### Bible Learning Features

Features for MC team members consuming learning content.

- [ ] **BIBL-07**: User can view all learning paths with progress indicators
- [ ] **BIBL-08**: User can view articles within a learning path
- [ ] **BIBL-09**: User can mark articles as complete (progress tracking)
- [ ] **BIBL-10**: User sees progress bar showing path completion percentage
- [ ] **BIBL-11**: Search within articles to find specific content
- [ ] **BIBL-12**: Table of contents navigation for long articles
- [ ] **BIBL-13**: Required vs optional article tracking (completion calculation)
- [ ] **BIBL-14**: Sections/categories within learning paths for organization

### Bible Completion & Recognition

Achievement and recognition features for learning progress.

- [ ] **BIBL-15**: Completion certificates generated upon path completion
- [ ] **BIBL-16**: Certificates include user name, path name, completion date
- [ ] **BIBL-17**: User can download certificate as PDF

### Challenge Auto-Grading

Automated grading for objective question types to reduce manual workload.

- [ ] **CHAL-01**: Automated grading for cloze (fill-in-blank) questions
- [ ] **CHAL-02**: Automated grading for drag-drop questions
- [ ] **CHAL-03**: Instant feedback shown after objective question submission
- [ ] **CHAL-04**: Auto-graded questions display score immediately
- [ ] **CHAL-05**: Support for partial credit in cloze questions

### Challenge Question Management

Advanced question management for challenge authors.

- [ ] **CHAL-06**: Question bank/pool system with tagging
- [ ] **CHAL-07**: Random selection from question pools for challenges
- [ ] **CHAL-08**: Question reuse across multiple challenges
- [ ] **CHAL-09**: Question difficulty rating system
- [ ] **CHAL-10**: Question filtering by difficulty and tags

### Challenge Results & Analytics

Detailed performance tracking and feedback for challenge participants.

- [ ] **CHAL-11**: Individual results page showing detailed performance
- [ ] **CHAL-12**: Results page shows score per question and overall score
- [ ] **CHAL-13**: Performance analytics over time (per user)
- [ ] **CHAL-14**: Team performance analytics and comparison
- [ ] **CHAL-15**: Comparative rankings and improvement tracking
- [ ] **CHAL-16**: Historical submission history per user

### Quiz Integration

Linking Bible learning content to Challenge quizzes.

- [ ] **INTG-01**: Articles can have embedded quiz questions
- [ ] **INTG-02**: Quiz completion contributes to article completion status
- [ ] **INTG-03**: Challenge questions can reference Bible articles

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADM-01 | Phase 1 | Pending |
| ADM-02 | Phase 1 | Pending |
| ADM-03 | Phase 1 | Pending |
| BIBL-01 | Phase 1 | Pending |
| BIBL-02 | Phase 1 | Pending |
| BIBL-03 | Phase 2 | Pending |
| BIBL-04 | Phase 2 | Pending |
| BIBL-05 | Phase 2 | Pending |
| BIBL-06 | Phase 2 | Pending |
| BIBL-07 | Phase 2 | Pending |
| BIBL-08 | Phase 2 | Pending |
| BIBL-09 | Phase 2 | Pending |
| BIBL-10 | Phase 2 | Pending |
| BIBL-11 | Phase 3 | Pending |
| BIBL-12 | Phase 3 | Pending |
| BIBL-13 | Phase 2 | Pending |
| BIBL-14 | Phase 3 | Pending |
| BIBL-15 | Phase 4 | Pending |
| BIBL-16 | Phase 4 | Pending |
| BIBL-17 | Phase 4 | Pending |
| CHAL-01 | Phase 5 | Pending |
| CHAL-02 | Phase 5 | Pending |
| CHAL-03 | Phase 5 | Pending |
| CHAL-04 | Phase 5 | Pending |
| CHAL-05 | Phase 5 | Pending |
| CHAL-06 | Phase 6 | Pending |
| CHAL-07 | Phase 6 | Pending |
| CHAL-08 | Phase 6 | Pending |
| CHAL-09 | Phase 6 | Pending |
| CHAL-10 | Phase 6 | Pending |
| CHAL-11 | Phase 7 | Pending |
| CHAL-12 | Phase 7 | Pending |
| CHAL-13 | Phase 7 | Pending |
| CHAL-14 | Phase 7 | Pending |
| CHAL-15 | Phase 7 | Pending |
| CHAL-16 | Phase 7 | Pending |
| INTG-01 | Phase 4 | Pending |
| INTG-02 | Phase 4 | Pending |
| INTG-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
