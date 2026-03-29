# Phase 5: MC Bible Completion - Context

**Created:** 2026-03-26
**Status:** Planning
**Depends on:** Phase 1 (Admin), Phase 4 (Dashboard - optional dependency)

## Problem Statement

The MC Bible has a solid foundation (database schema, CRUD APIs, basic pages, progress tracking) but is missing key features that make it a complete learning platform:

1. **Missing Content Types** - Slides/presentations are a critical content format for training
2. **Poor Discoverability** - No search within articles, no table of contents for long articles
3. **No Recognition** - Users don't get certificates upon completing learning paths
4. **Limited Engagement** - No quiz integration, articles are static text only
5. **Basic Organization** - No sections/categories within learning paths

## Current State Assessment

### What's Working (40-50% complete)
- ✅ Database schema with all core tables
- ✅ TypeScript types and permissions
- ✅ CRUD APIs for paths/articles
- ✅ Progress tracking system
- ✅ File upload and video embeds
- ✅ Drag-drop article reordering
- ✅ Required/optional article tracking

### What's Missing (6 feature areas)
1. Slides/presentations support (4 requirements)
2. Article search functionality (1 requirement)
3. Table of contents navigation (1 requirement)
4. Sections/categories organization (1 requirement)
5. Completion certificates (3 requirements)
6. Quiz integration (4 requirements)

## Success Criteria

Phase 5 is complete when:
1. Admin can create slide deck articles with Google Slides/PowerPoint URLs
2. Users can navigate slide decks with prev/next controls
3. Users can search within article content (not just path titles)
4. Long articles show table of contents in sidebar
5. Paths can be organized into sections/categories
6. Users receive PDF certificates upon path completion
7. Quiz questions can be embedded in articles
8. Challenge questions can link to relevant Bible articles

## Technical Context

### Existing Database Schema
```sql
bible_paths (id, title, description, icon, color, created_by)
bible_articles (id, title, content, content_type, video_url, file_url, tags, created_by)
bible_path_articles (id, path_id, article_id, display_order, is_required)
bible_user_progress (id, user_id, article_id, completed_at)
```

### Missing Database Fields
- `bible_articles.slide_deck_url` - for slide content type
- `bible_paths.sections` - JSON array of section names
- `bible_articles.quiz_data` - JSON for embedded quiz questions
- `challenge_questions.bible_article_id` - FK to bible_articles

### Existing Libraries
- ✅ jsPDF + html2canvas (installed but not used)
- ✅ TinyMCE (rich text editor)
- ✅ @dnd-kit (drag-drop reordering)
- ❌ No slide viewer library needed (use iframe)

## User Stories

### As a Content Creator (Admin/Manager/Leader)
- I want to create slide deck articles so I can share PowerPoint presentations
- I want to organize paths into sections so content is easier to navigate
- I want to embed quizzes in articles so learners can check understanding

### As a Learner (All Users)
- I want to search within articles so I can find specific information quickly
- I want to see table of contents so I can jump to relevant sections
- I want to receive a certificate when I complete a learning path
- I want to view slide presentations with navigation controls
- I want to take quizzes without leaving the article

## Dependencies

### Phase Dependencies
- **Phase 1** (Admin Unification) - ✅ Complete, provides admin structure
- **Phase 4** (Dashboard) - ⏳ Optional, provides monitoring data but not blocking

### Technical Dependencies
- None blocking - can build all features independently
- Quiz integration benefits from existing challenge system

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Slide embed iframes blocked by CSP | Medium | Use CSP-compatible embed URLs, provide fallback links |
| Certificate PDF generation fails | Medium | Add error handling, fallback to HTML certificate view |
| Article search performance at scale | Low | PostgreSQL full-text search is efficient for expected data size |
| Quiz data model complexity | Medium | Start with simple JSON structure, normalize if needed |

## Open Questions

1. **Slides embed** - Should we support both Google Slides and PowerPoint Online, or start with one?
2. **Certificate design** - Should certificates be templated (all paths same layout) or customizable per path?
3. **Quiz grading** - Should embedded quizzes be auto-graded (for engagement) or manually graded (for assessment)?
4. **Sections implementation** - Should sections be a simple JSON array or a separate table with metadata?

## Research Needed

None required - all features are straightforward implementations using existing patterns and libraries.
