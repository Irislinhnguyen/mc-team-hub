# Phase 5: MC Bible Completion - Implementation Plan

**Created:** 2026-03-26
**Status:** Ready for execution
**Estimated Duration:** ~90 minutes
**Total Plans:** 5 waves
**Requirements Coverage:** 25 requirements (BIBL-01 to INTG-04)

## Overview

This phase completes the MC Bible (Course Edition) learning platform by adding missing content types, navigation features, recognition system, and quiz integration.

## Wave Structure

| Wave | Focus | Plans | Duration | Requirements |
|------|-------|-------|----------|--------------|
| 1 | Slides/Presentations | 2 | ~20 min | BIBL-15 to BIBL-18 |
| 2 | Search & Navigation | 2 | ~15 min | BIBL-11, BIBL-12 |
| 3 | Sections Organization | 1 | ~10 min | BIBL-14 |
| 4 | Completion Certificates | 2 | ~25 min | BIBL-19 to BIBL-21 |
| 5 | Quiz Integration | 2 | ~20 min | INTG-01 to INTG-04 |

---

## Wave 1: Slides/Presentations Support

**Goal:** Enable slide deck content as a first-class article type.

**Duration:** ~20 minutes
**Requirements:** BIBL-15, BIBL-16, BIBL-17, BIBL-18

### Plan 05-01: Database + Types for Slides
**Duration:** ~8 minutes
**Tasks:** 3

1. **Add slide_deck_url field to bible_articles table**
   - Migration: `ALTER TABLE bible_articles ADD COLUMN slide_deck_url TEXT`
   - Add check constraint for valid URL format
   - Update TypeScript types (Article interface)
   - Add 'slides' to ARTICLE_CONTENT_TYPES array

2. **Update API validation schemas**
   - Add slide_deck_url to CreateArticleRequest/UpdateArticleRequest
   - Add URL validation regex for slide deck URLs
   - Update ArticleEditor to support slide URL input

3. **Update content type checks**
   - Add 'slides' to content_type enum check constraint
   - Update display logic in article viewer to handle slides type

**Success Criteria:**
- Migration applied successfully
- TypeScript types compile without errors
- API accepts slide_deck_url in requests

---

### Plan 05-02: Slide Viewer Component
**Duration:** ~12 minutes
**Tasks:** 4

1. **Create SlideViewer component**
   - Component: `components/bible/SlideViewer.tsx`
   - Props: slideUrl, title
   - Features: iframe embed, responsive container, fallback link
   - Support: Google Slides, PowerPoint Online embed formats

2. **Create SlideNavigation controls**
   - Component: `components/bible/SlideNavigation.tsx`
   - Features: Previous/Next buttons, slide counter (1/10)
   - Integration with iframe postMessage for slide control
   - Keyboard shortcuts (arrow keys)

3. **Update ArticleEditor for slide content**
   - Add slide deck URL input field
   - Add preview button for slide URL validation
   - Show slide icon when content_type is 'slides'

4. **Integrate into article viewer**
   - Update `app/(protected)/bible/paths/[id]/page.tsx`
   - Conditionally render SlideViewer when content_type === 'slides'
   - Pass slide_deck_url to viewer component

**Success Criteria:**
- Slide decks render in iframe correctly
- Navigation controls work
- Keyboard shortcuts functional
- Fallback link shows when iframe blocked

---

## Wave 2: Article Search & Navigation

**Goal:** Improve content discoverability and navigation within articles.

**Duration:** ~15 minutes
**Requirements:** BIBL-11, BIBL-12

### Plan 05-03: Article Search Feature
**Duration:** ~8 minutes
**Tasks:** 3

1. **Create article search API endpoint**
   - Route: `GET /api/bible/articles/search`
   - Query params: `q` (search term), `path_id` (optional filter)
   - Use existing `search_articles()` PostgreSQL function
   - Return ranked results with highlighting

2. **Create ArticleSearch component**
   - Component: `components/bible/ArticleSearch.tsx`
   - Features: Search input, debounced search, result highlighting
   - Display: Title + snippet with matched terms highlighted
   - Click: Navigate to article and scroll to matched section

3. **Integrate into article viewer**
   - Add search button/icon to article header
   - Show search results dropdown/panel
   - Highlight search terms in article content
   - Add "search this article" to path sidebar

**Success Criteria:**
- Search returns relevant results
- Search terms highlighted in results
- Clicking result navigates to article
- Search works across all paths or within specific path

---

### Plan 05-04: Table of Contents Navigation
**Duration:** ~7 minutes
**Tasks:** 3

1. **Create TOC extraction utility**
   - Function: `lib/utils/article-toc.ts`
   - Parse article HTML for h2, h3 headings
   - Generate hierarchical TOC structure
   - Add ID anchors to headings for linking

2. **Create ArticleTOC component**
   - Component: `components/bible/ArticleTOC.tsx`
   - Display: Hierarchical list of headings (h2, h3)
   - Features: Active section highlighting, smooth scroll
   - Responsive: Collapsible on mobile, sticky on desktop

3. **Integrate into article viewer**
   - Add TOC sidebar to article layout
   - Generate TOC from article content on mount
   - Highlight active section on scroll
   - Click TOC item to scroll to section

**Success Criteria:**
- TOC extracts all h2/h3 headings
- Clicking TOC scrolls to section
- Active section highlighted as user scrolls
- TOC updates when article content changes

---

## Wave 3: Sections Organization

**Goal:** Organize paths into sections/categories for better structure.

**Duration:** ~10 minutes
**Requirements:** BIBL-14

### Plan 05-05: Sections within Learning Paths
**Duration:** ~10 minutes
**Tasks:** 3

1. **Add sections field to bible_paths table**
   - Migration: `ALTER TABLE bible_paths ADD COLUMN sections JSONB DEFAULT '[]'`
   - Store as array: `["Basics", "Advanced", "Reference"]`
   - Add validation for JSON structure

2. **Update Path management UI**
   - Add sections editor to `/bible/manage`
   - Allow adding/removing/reordering sections
   - Drag articles between sections
   - Update display_order to account for sections

3. **Update Path viewer layout**
   - Group articles by section in sidebar
   - Show section headers with separators
   - Add section collapse/expand functionality
   - Display section progress (X/Y articles complete)

**Success Criteria:**
- Sections can be created/edited/deleted
- Articles group correctly under sections
- Progress calculated per section
- UI handles empty sections gracefully

---

## Wave 4: Completion Certificates

**Goal:** Recognize user achievement with PDF certificates.

**Duration:** ~25 minutes
**Requirements:** BIBL-19, BIBL-20, BIBL-21

### Plan 05-06: Certificate Generation System
**Duration:** ~15 minutes
**Tasks:** 4

1. **Create certificate template**
   - File: `lib/certificate/template.ts`
   - Design: Professional layout with path name, user name, date
   - Technology: jsPDF + html2canvas (already installed)
   - Customization: Path color as accent, path icon

2. **Create certificate generation API**
   - Route: `POST /api/bible/paths/[id]/certificate`
   - Auth: Require authenticated user
   - Validation: Check if user completed 100% of path
   - Response: PDF blob or signed URL

3. **Create Certificate component**
   - Component: `components/bible/Certificate.tsx`
   - Display: Preview of certificate with download button
   - Features: Regenerate, share (copy link), print
   - Animation: Confetti celebration on first view

4. **Add certificate trigger**
   - Check path completion on progress update
   - Show certificate banner when path reaches 100%
   - Store certificate_generated_at in user profile or path progress
   - Send notification when certificate earned

**Success Criteria:**
- Certificate generates correctly as PDF
- User name, path name, date displayed accurately
- Download works on all browsers
- Certificate shows only when path completed

---

### Plan 05-07: Certificate Download Flow
**Duration:** ~10 minutes
**Tasks:** 3

1. **Add certificate button to completed paths**
   - Show certificate icon on completed path cards
   - Button: "Download Certificate" on path detail page
   - Hide button if certificate not yet generated

2. **Create certificate history tracking**
   - Table: `bible_certificates` (id, user_id, path_id, generated_at, download_count)
   - Track when certificates generated and downloaded
   - Prevent re-generation spam (rate limit)

3. **Add certificate management**
   - Admin view: See all issued certificates
   - Revoke capability (if needed for compliance)
   - Batch certificate generation for multiple users

**Success Criteria:**
- Certificate button appears only for completed paths
- Download increments counter
- Certificate downloads reliably
- Admin can view certificate history

---

## Wave 5: Quiz Integration

**Goal:** Add interactive quizzes to articles for engagement.

**Duration:** ~20 minutes
**Requirements:** INTG-01, INTG-02, INTG-03, INTG-04

### Plan 05-08: Embedded Quizzes in Articles
**Duration:** ~12 minutes
**Tasks:** 4

1. **Add quiz_data field to bible_articles table**
   - Migration: `ALTER TABLE bible_articles ADD COLUMN quiz_data JSONB`
   - Schema: `[{ question, options, correct_answer, explanation }]`
   - Add validation for quiz structure

2. **Create Quiz component**
   - Component: `components/bible/Quiz.tsx`
   - Features: Multiple choice questions, instant feedback, score display
   - State: Track answers, show results at end
   - Design: Inline with article content, styled card

3. **Create QuizEditor component**
   - Component: `components/bible/QuizEditor.tsx`
   - Features: Add/edit/delete questions, preview mode
   - UI: Question input, option inputs, correct answer selector
   - Validation: Require at least 2 options per question

4. **Integrate quizzes into ArticleEditor**
   - Add "Insert Quiz" button to toolbar
   - Show quiz editor modal when clicked
   - Render quiz preview in editor
   - Save quiz_data with article content

**Success Criteria:**
- Quizzes render inline in articles
- Questions, options, feedback display correctly
- Score calculated accurately
- Quiz editor is intuitive for content creators

---

### Plan 05-09: Quiz Completion Tracking & Challenge Links
**Duration:** ~8 minutes
**Tasks:** 3

1. **Track quiz completion**
   - Table: `bible_quiz_attempts` (id, user_id, article_id, score, completed_at)
   - API: `POST /api/bible/articles/[id]/quiz/submit`
   - Require quiz completion for article completion (optional flag)
   - Show quiz history in user profile

2. **Link challenge questions to Bible articles**
   - Migration: `ALTER TABLE challenge_questions ADD COLUMN bible_article_id UUID`
   - FK reference: `bible_article_id` → `bible_articles(id)`
   - Update Challenge UI to show "Related Article" link
   - Open article in new tab/side panel

3. **Add article links to challenge questions**
   - When taking challenge, show "Learn more" link if question has bible_article_id
   - Track which articles are most referenced in challenges
   - Suggest related articles based on challenge performance

**Success Criteria:**
- Quiz attempts saved to database
- Article completion can require quiz passing
- Challenge questions show article links
- Users can navigate from challenge to related articles

---

## Wave 6: Final Integration & Polish

**Goal:** Ensure all features work together seamlessly.

**Duration:** ~10 minutes
**Tasks:** 3

1. **End-to-end testing**
   - Test complete user journey: view path → read article → pass quiz → complete section → finish path → download certificate
   - Test admin workflow: create path → add sections → create articles (text/slides/quiz) → publish
   - Test search: search paths, search articles, find via TOC

2. **Performance optimization**
   - Lazy load slide iframes
   - Debounce search input
   - Cache TOC generation
   - Optimize certificate PDF generation

3. **Documentation**
   - Update admin guide with new features
   - Create user guide for certificates
   - Document quiz embedding process

**Success Criteria:**
- All features work without errors
- Console has no warnings/errors
- Page load times under 2 seconds
- Mobile responsive for all new components

---

## Dependencies

### External Dependencies
- None - all features use existing libraries (jsPDF, @dnd-kit, etc.)

### Phase Dependencies
- Phase 1 (Admin Unification) - ✅ Complete
- Phase 4 (Dashboard) - ⏳ Optional, not blocking

### Internal Dependencies
- Wave 1 (Slides) must be before Wave 2 (Search can index slide content)
- Wave 4 (Certificates) requires Wave 3 (Sections for proper completion calculation)
- Wave 5 (Quizzes) independent of other waves

## Risk Mitigation

| Risk | Plan |
|------|------|
| Slide embed CSP issues | Test with Google Slides first, add fallback link |
| Certificate PDF fails | Fallback to HTML certificate view, alert admin |
| Quiz data model limits | Use JSONB for flexibility, normalize if complex queries needed |
| TOC extraction fails | Fallback to no TOC, log error for manual heading ID addition |

## Rollback Plan

Each wave can be independently rolled back:
- Wave 1: Drop slide_deck_url column, remove 'slides' from content types
- Wave 2: Remove search endpoint and TOC component
- Wave 3: Drop sections column, revert path UI
- Wave 4: Drop certificate table, remove certificate button
- Wave 5: Drop quiz_data column, remove quiz components

## Success Metrics

- [ ] All 25 requirements from Phase 5 implemented
- [ ] 100% of existing tests still pass
- [ ] New tests added for each feature
- [ ] User can complete full learning journey
- [ ] Admin can create all content types
- [ ] No performance regression

---

*Plan created: 2026-03-26*
*Total estimated effort: ~90 minutes across 6 waves*
