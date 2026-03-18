# Research Summary: MC Bible + Knowledge Championship

**Domain:** Internal Learning Management + Quiz/Assessment Platform
**Researched:** 2026-03-18
**Overall confidence:** MEDIUM (web search unavailable, relied on codebase analysis)

## Executive Summary

The query-stream-ai platform already has a solid foundation for learning platform features. The existing Next.js 15 + Supabase + Radix UI stack is well-suited for building both MC Bible (learning platform) and Knowledge Championship (quiz system) without major technology additions.

**Key finding:** Build custom learning/quiz components rather than integrating monolithic LMS libraries. Internal training platforms don't need the complexity of commercial course platforms (SCORM, payments, marketplaces). The existing codebase already has 80% of necessary UI components and database patterns.

**Critical additions needed:**
1. Auto-grading engine for cloze (fill-in-blank) and drag-drop questions
2. Certificate generation using already-installed jsPDF + html2canvas
3. Enhanced admin patterns leveraging existing Radix UI components

## Key Findings

**Stack:** Next.js 15.5.7 + React 18 + Supabase + Radix UI (shadcn pattern) + TanStack Query + React Hook Form — **no major changes needed**

**Architecture:** Build custom learning/quiz components on existing patterns; avoid full LMS frameworks (react-admin, refine) as they don't fit Next.js App Router

**Critical pitfall:** The project has duplicate code across apps/web and apps/admin; unify admin interface before adding new features to avoid multiplying technical debt

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Admin Unification (Foundation)
**Addresses:** Technical debt, code duplication, inconsistent admin patterns
**Avoids:** Building new features on unstable foundation

**Rationale:**
- Current codebase has duplicate admin UIs across apps/web and apps/admin
- Adding Bible/Challenge admin features will multiply duplication
- Existing Radix UI components are sufficient for unified admin

**Deliverables:**
- Migrate apps/admin functionality to apps/web `/admin`
- Create shared admin components in `/packages/admin`
- Delete apps/admin after migration
- Document admin component patterns

### Phase 2: MC Bible Completion
**Addresses:** DED-01 through DED-08 from PROJECT.md

**Rationale:**
- Learning platform features are foundational (knowledge delivery before testing)
- Database schema exists and is well-designed
- Rich text editor (TinyMCE) already installed
- Progress tracking database functions already exist

**Key features:**
- Dedicated admin panel for Bible content (build on unified admin)
- Search within articles (use existing full-text index)
- Table of contents navigation (Radix Accordion already installed)
- Quiz integration with articles (reuse Challenge questions)
- Completion certificates (jsPDF + html2canvas already installed)

### Phase 3: Auto-Grading Engine
**Addresses:** KPC-01, KPC-02, KPC-03 (instant feedback for objective questions)

**Rationale:**
- Auto-grading reduces manual grading workload significantly
- Technical complexity is medium-high (parsing Moodle format)
- Should be built before question bank system (KPC-04)

**Implementation:**
- Build standalone `autoGradingService` with cloze/drag-drop parsers
- Test with existing challenge data
- Add instant feedback to challenge taking flow
- No new libraries needed (custom implementation)

### Phase 4: Question Management System
**Addresses:** KPC-04, KPC-05, KPC-06 (question banks, reuse, difficulty)

**Rationale:**
- Depends on auto-grading engine (question banks need graded questions)
- Allows content creators to build question library
- Reduces duplicate question creation across challenges

**Key features:**
- Question bank/pool with tagging
- Question reuse across multiple challenges
- Difficulty rating system
- Random selection from pools

### Phase 5: Results & Analytics
**Addresses:** KPC-07, KPC-08, KPC-09 (individual results, performance analytics, rankings)

**Rationale:**
- Builds on auto-grading and question management
- Recharts already installed for visualizations
- Requires meaningful data from previous phases

**Key features:**
- Individual results page with detailed performance
- Performance analytics over time (per user and per team)
- Comparative rankings and improvement tracking
- Export functionality (CSV/Excel already supported with xlsx library)

**Phase ordering rationale:**
1. Admin unification first — prevents multiplying technical debt
2. Bible completion before advanced quiz features — knowledge delivery before testing
3. Auto-grading before question banks — need grading to make questions reusable
4. Analytics last — needs data from previous phases

**Research flags for phases:**
- **Phase 1 (Admin):** Standard patterns, LOW research need
- **Phase 2 (Bible):** Certificate generation needs MEDIUM research (jsPDF patterns)
- **Phase 3 (Auto-grading):** Cloze parsing needs MEDIUM research (Moodle format edge cases)
- **Phase 4 (Question Banks):** Database schema design needs MEDIUM research (many-to-many relationships)
- **Phase 5 (Analytics):** Standard Recharts patterns, LOW research need

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified from package.json files |
| Bible Features | MEDIUM | Database schema exists, UI patterns known |
| Challenge Features | HIGH | Challenge system already functional |
| Admin Patterns | MEDIUM | Radix UI components verified, but unification needs planning |
| Auto-grading | LOW-MEDIUM | Custom implementation, no external libraries used |
| Certificate Generation | MEDIUM | jsPDF + html2canvas installed, but patterns need verification |
| Question Banks | MEDIUM | Database design needs careful planning |

**Overall confidence: MEDIUM** — Web search was unavailable during research. Stack recommendations based on existing codebase analysis (HIGH confidence) and author's knowledge of Next.js ecosystem (MEDIUM confidence, may need verification with official docs).

## Gaps to Address

### Technical Gaps (Need Phase-Specific Research)

1. **jsPDF certificate templates**
   - Need to verify jsPDF API for image embedding and text placement
   - Research: html2canvas quality issues with text rendering
   - Prototype: Create sample certificate with user name, path name, date

2. **Cloze question parsing edge cases**
   - Moodle format has variations (multiple choice, case sensitivity)
   - Need to handle: {1:France}, {1:France~London~Berlin}, {1:=France} (shown in answer)
   - Research: Moodle Cloze documentation for full format spec

3. **Question bank database schema**
   - Many-to-many relationships: questions ↔ tags ↔ challenges
   - Versioning: if question is edited, what happens to old challenges?
   - Research: Look at how Canvas/Edmodo handle question versioning

### Process Gaps

4. **Admin unification strategy**
   - How to merge duplicate admin apps without breaking existing functionality?
   - Migration plan for users currently using apps/admin
   - Research: Next.js monorepo app consolidation patterns

5. **Progress tracking for embedded quizzes**
   - If article has quiz questions, when is article "complete"?
   - Pass/fail threshold? Retry attempts?
   - Research: Corporate LMS quiz integration patterns

### Feature Gaps (Out of Scope but Noted)

6. **Email notifications**
   - Challenge deadlines, new content available
   - Not in current scope, but nodemailer already installed
   - Future research: React Email for transactional email templates

7. **Advanced analytics**
   - Learning paths effectiveness, knowledge gaps
   - Would require BigQuery integration (already exists in platform)
   - Future research: Learning analytics standards (xAPI, Caliper)

## Recommended Next Steps

1. **Verify jsPDF certificate generation** (Phase 2 prerequisite)
   - Create prototype certificate using HTML template
   - Test html2canvas rendering quality
   - Verify PDF text placement and styling

2. **Prototype cloze auto-grading** (Phase 3 prerequisite)
   - Build standalone parser for Moodle cloze format
   - Test with edge cases (multiple choice, case sensitivity, partial credit)
   - Verify drag-drop scoring logic

3. **Plan admin unification** (Phase 1)
   - Inventory duplicate components across apps/web and apps/admin
   - Design shared component structure for /packages/admin
   - Create migration checklist

4. **Research question bank schema** (Phase 4)
   - Design many-to-many relationships for tags and challenges
   - Plan question versioning strategy
   - Consider performance implications for large question banks

5. **Document learning platform patterns** (All phases)
   - Create style guide for article content (consistency)
   - Document quiz question writing best practices
   - Create admin panel component documentation

---

*Research summary for: MC Bible + Knowledge Championship*
*Researched: 2026-03-18*
*Web search unavailable — findings based on codebase analysis and author knowledge*
