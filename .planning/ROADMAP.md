# Roadmap: MC Bible & Knowledge Championship

**Created:** 2026-03-18
**Granularity:** Coarse (aggressive compression)
**Phases:** 4
**Coverage:** 35/35 requirements mapped

## Phases

- [ ] **Phase 1: Admin Unification** - Unified admin interface and shared components
- [ ] **Phase 2: Bible Core** - Content management, learning experience, progress tracking
- [ ] **Phase 3: Challenge Enhancement** - Auto-grading and question management
- [ ] **Phase 4: Recognition & Analytics** - Certificates, quiz integration, and performance analytics

## Phase Details

### Phase 1: Admin Unification

**Goal:** Consolidate duplicate admin interfaces into a unified system with shared patterns and components.

**Depends on:** Nothing (first phase)

**Requirements:**
- ADM-01: Unified admin interface for both Bible and Challenges management
- ADM-02: Consistent admin navigation and patterns across all admin panels
- ADM-03: Shared admin components (forms, tables, dialogs) for reuse

**Success Criteria** (what must be TRUE):
1. Admin can access both Bible and Challenges management from a single unified interface
2. All admin panels use consistent navigation patterns and component styling
3. Shared components can be imported and reused across admin features
4. Duplicate admin code has been consolidated (no redundant implementations)

**Plans:** TBD

---

### Phase 2: Bible Core

**Goal:** Deliver complete MC Bible learning experience with content management, learning features, and progress tracking.

**Depends on:** Phase 1 (Admin Unification)

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
- BIBL-13: Required vs optional article tracking (completion calculation)

**Success Criteria** (what must be TRUE):
1. Admin can create and manage learning paths with articles, including rich text content and file attachments
2. Users can browse learning paths, view articles, and track their progress
3. Progress bars accurately reflect completion percentage based on required articles
4. Role-based permissions control who can create and edit Bible content

**Plans:** TBD

---

### Phase 3: Challenge Enhancement

**Goal:** Enable automated grading for objective questions and implement a reusable question management system.

**Depends on:** Phase 1 (Admin Unification)

**Requirements:**
- CHAL-01: Automated grading for cloze (fill-in-blank) questions
- CHAL-02: Automated grading for drag-drop questions
- CHAL-03: Instant feedback shown after objective question submission
- CHAL-04: Auto-graded questions display score immediately
- CHAL-05: Support for partial credit in cloze questions
- CHAL-06: Question bank/pool system with tagging
- CHAL-07: Random selection from question pools for challenges
- CHAL-08: Question reuse across multiple challenges
- CHAL-09: Question difficulty rating system
- CHAL-10: Question filtering by difficulty and tags

**Success Criteria** (what must be TRUE):
1. Objective questions (cloze, drag-drop) are graded automatically with immediate feedback
2. Questions can be organized into tagged pools with difficulty ratings
3. Challenges can randomly select questions from pools for varied assessments
4. Questions can be reused across multiple challenges without duplication

**Plans:** TBD

---

### Phase 4: Recognition & Analytics

**Goal:** Provide completion certificates, integrate quizzes with learning content, and deliver performance analytics.

**Depends on:** Phase 2 (Bible Core), Phase 3 (Challenge Enhancement)

**Requirements:**
- BIBL-11: Search within articles to find specific content
- BIBL-12: Table of contents navigation for long articles
- BIBL-14: Sections/categories within learning paths for organization
- BIBL-15: Completion certificates generated upon path completion
- BIBL-16: Certificates include user name, path name, completion date
- BIBL-17: User can download certificate as PDF
- CHAL-11: Individual results page showing detailed performance
- CHAL-12: Results page shows score per question and overall score
- CHAL-13: Performance analytics over time (per user)
- CHAL-14: Team performance analytics and comparison
- CHAL-15: Comparative rankings and improvement tracking
- CHAL-16: Historical submission history per user
- INTG-01: Articles can have embedded quiz questions
- INTG-02: Quiz completion contributes to article completion status
- INTG-03: Challenge questions can reference Bible articles

**Success Criteria** (what must be TRUE):
1. Users receive downloadable PDF certificates upon completing learning paths
2. Articles support search, table of contents, and section organization
3. Quiz questions can be embedded in articles and linked to challenges
4. Users can view detailed performance analytics, rankings, and submission history
5. Managers can view team-level analytics and performance comparisons

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Admin Unification | 0/3 | Not started | - |
| 2. Bible Core | 0/2 | Not started | - |
| 3. Challenge Enhancement | 0/2 | Not started | - |
| 4. Recognition & Analytics | 0/3 | Not started | - |

---

## Dependencies

```
Phase 1: Admin Unification
    ↓
    ├─→ Phase 2: Bible Core ────┐
    │                          │
    └─→ Phase 3: Challenge Enhancement
                               │
                               ↓
                    Phase 4: Recognition & Analytics
```

**Key dependency notes:**
- Phase 2 and 3 can run in parallel after Phase 1 completes
- Phase 4 requires content from Phase 2 (Bible data) and Phase 3 (graded questions)
- Quiz integration (INTG-01 to INTG-03) bridges Bible and Challenge features

---

## Coverage Summary

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADM-01 | Phase 1 | Pending |
| ADM-02 | Phase 1 | Pending |
| ADM-03 | Phase 1 | Pending |
| BIBL-01 | Phase 2 | Pending |
| BIBL-02 | Phase 2 | Pending |
| BIBL-03 | Phase 2 | Pending |
| BIBL-04 | Phase 2 | Pending |
| BIBL-05 | Phase 2 | Pending |
| BIBL-06 | Phase 2 | Pending |
| BIBL-07 | Phase 2 | Pending |
| BIBL-08 | Phase 2 | Pending |
| BIBL-09 | Phase 2 | Pending |
| BIBL-10 | Phase 2 | Pending |
| BIBL-11 | Phase 4 | Pending |
| BIBL-12 | Phase 4 | Pending |
| BIBL-13 | Phase 2 | Pending |
| BIBL-14 | Phase 4 | Pending |
| BIBL-15 | Phase 4 | Pending |
| BIBL-16 | Phase 4 | Pending |
| BIBL-17 | Phase 4 | Pending |
| CHAL-01 | Phase 3 | Pending |
| CHAL-02 | Phase 3 | Pending |
| CHAL-03 | Phase 3 | Pending |
| CHAL-04 | Phase 3 | Pending |
| CHAL-05 | Phase 3 | Pending |
| CHAL-06 | Phase 3 | Pending |
| CHAL-07 | Phase 3 | Pending |
| CHAL-08 | Phase 3 | Pending |
| CHAL-09 | Phase 3 | Pending |
| CHAL-10 | Phase 3 | Pending |
| CHAL-11 | Phase 4 | Pending |
| CHAL-12 | Phase 4 | Pending |
| CHAL-13 | Phase 4 | Pending |
| CHAL-14 | Phase 4 | Pending |
| CHAL-15 | Phase 4 | Pending |
| CHAL-16 | Phase 4 | Pending |
| INTG-01 | Phase 4 | Pending |
| INTG-02 | Phase 4 | Pending |
| INTG-03 | Phase 4 | Pending |

**Total v1 requirements:** 35
**Mapped to phases:** 35
**Unmapped:** 0 ✓

---

*Roadmap created: 2026-03-18*
*Last updated: 2026-03-18*
