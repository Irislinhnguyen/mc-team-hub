# Phase 5: MC Bible Completion - Research & Technical Decisions

**Created:** 2026-03-26
**Status:** Complete

## Overview

This document summarizes research findings and technical decisions for Phase 5 features.

---

## Wave 1: Slides/Presentations

### Research Question: Which slide platforms should we support?

**Options Considered:**
1. Google Slides only
2. PowerPoint Online only
3. Both Google Slides and PowerPoint Online
4. Custom PDF viewer

**Decision: Support both Google Slides and PowerPoint Online**

**Rationale:**
- Both platforms provide embed URLs via iframe
- No additional library needed (use native iframe)
- Users may have content on either platform
- Fallback link handles unsupported formats

**Technical Implementation:**
```typescript
// Google Slides embed format
https://docs.google.com/presentation/d/{DOCUMENT_ID}/embed

// PowerPoint Online embed format
https://view.officeapps.live.com/op/embed.aspx?src={FILE_URL}
```

**CSP Considerations:**
- Add `frame-src` for docs.google.com and officeapps.live.com
- Provide fallback link when iframe blocked
- Show error message with instructions to open directly

---

## Wave 2: Article Search & Navigation

### Research Question: Should we use PostgreSQL full-text search or external service?

**Options Considered:**
1. PostgreSQL full-text search (already indexed)
2. Algolia
3. ElasticSearch
4. Meilisearch

**Decision: Use PostgreSQL full-text search**

**Rationale:**
- Database already has full-text index on articles (idx_bible_articles_fulltext)
- `search_articles()` function already exists in migration
- No additional infrastructure needed
- Sufficient performance for expected data size (<10K articles)
- Lower complexity and cost

**Technical Implementation:**
```sql
-- Existing function from migration
CREATE OR REPLACE FUNCTION search_articles(p_search_term TEXT)
RETURNS TABLE(article_id UUID, title TEXT, content_type TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content_type,
    ts_rank(to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')),
           plainto_tsquery('english', p_search_term)) as rank
  FROM public.bible_articles a
  WHERE to_tsvector('english', a.title || ' ' || COALESCE(a.content, ''))
        @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC, a.title;
END;
$$ LANGUAGE plpgsql STABLE;
```

**TOC Extraction Approach:**
- Parse HTML for h2, h3 headings
- Use `DOMParser` or regex pattern matching
- Generate ID anchors for headings if not present
- Highlight active section on scroll using IntersectionObserver

---

## Wave 3: Sections Organization

### Research Question: Should sections be a separate table or JSON field?

**Options Considered:**
1. Separate table (bible_path_sections)
2. JSON array in bible_paths.sections
3. Numbered prefix in article titles (e.g., "1. Basics: Introduction")

**Decision: JSON array in bible_paths.sections**

**Rationale:**
- Sections are simple metadata (list of names)
- No need for complex queries or joins
- Easy to reorder with drag-drop
- No additional table overhead
- Can migrate to separate table if needs evolve

**Data Structure:**
```typescript
// In bible_paths table
sections: string[] // ["Basics", "Advanced", "Reference"]

// In bible_path_articles table
section: string | null // Optional: which section article belongs to
```

**UI Considerations:**
- Display section headers in sidebar
- Group articles by section
- Show progress per section
- Allow collapsing sections

---

## Wave 4: Completion Certificates

### Research Question: How should we generate PDF certificates?

**Options Considered:**
1. jsPDF (already installed)
2. Puppeteer (headless Chrome)
3. Server-side PDF generation service
4. HTML-to-PDF API (e.g., Cloudmersive)

**Decision: Use jsPDF + html2canvas (client-side generation)**

**Rationale:**
- Both libraries already installed (see STATE.md)
- No server-side rendering needed
- Can customize per path (color, icon)
- User can regenerate if needed
- No additional API calls or costs

**Technical Implementation:**
```typescript
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// Generate certificate from HTML template
async function generateCertificate(userName: string, pathName: string, date: string) {
  const certificate = document.getElementById('certificate-template')
  const canvas = await html2canvas(certificate)
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('landscape')
  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210)
  pdf.save(`certificate-${pathName}.pdf`)
}
```

**Certificate Design:**
- Landscape orientation
- Path color as border/accent
- Path icon displayed
- User name, path name, completion date
- Signature line (admin/manager)
- Unique certificate ID (UUID)

**Security Considerations:**
- Store certificate issuance in database
- Add verification URL on certificate
- Include UUID for verification
- Prevent re-generation spam (rate limit)

---

## Wave 5: Quiz Integration

### Research Question: Should quiz data be normalized or JSON?

**Options Considered:**
1. Normalized: Separate tables for quizzes, questions, options
2. JSON: Store quiz data as JSONB in bible_articles
3. Hybrid: Quiz metadata in table, questions as JSON

**Decision: JSONB in bible_articles.quiz_data**

**Rationale:**
- Quizzes are embedded in articles, not standalone entities
- Simple structure (array of questions)
- No complex queries needed (just fetch and display)
- Easy to version with article content
- Can migrate to separate table if quiz features grow

**Data Structure:**
```typescript
// In bible_articles table
quiz_data: {
  questions: Array<{
    id: string
    question: string
    options: string[]
    correct_answer: number // index of correct option
    explanation?: string
  }>
  passing_score?: number // default 80%
  required_for_completion?: boolean // default false
}

// Quiz attempts
bible_quiz_attempts: {
  id: UUID
  user_id: UUID
  article_id: UUID
  answers: number[] // selected option indices
  score: number
  passed: boolean
  completed_at: TIMESTAMPTZ
}
```

**Grading Approach:**
- Instant feedback (show correct/incorrect after each question)
- Score calculated at end
- Pass/fail based on passing_score threshold
- Store attempt for history

---

## Cross-Cutting Concerns

### Performance

| Feature | Performance Strategy |
|---------|---------------------|
| Slide embeds | Lazy load iframes, load only when visible |
| Article search | Debounce input (300ms), limit results to 20 |
| TOC generation | Cache on article load, regenerate only if content changes |
| Certificates | Generate on-demand, store in storage bucket |
| Quizzes | Client-side grading, no server load |

### Accessibility

| Feature | Accessibility Considerations |
|---------|----------------------------|
| Slides | Keyboard navigation, fallback link for screen readers |
| Search | ARIA labels, focus management |
| TOC | Semantic heading structure, skip links |
| Certificates | Alt text for PDF, accessible HTML version |
| Quizzes | Keyboard navigation, screen reader announcements |

### Mobile Responsiveness

| Feature | Mobile Considerations |
|---------|---------------------|
| Slides | Responsive iframe, landscape mode suggestion |
| Search | Full-screen results on mobile |
| TOC | Collapsible, bottom sheet on mobile |
| Certificates | Mobile PDF viewer, share button |
| Quizzes | Single column layout, larger touch targets |

---

## Open Questions & Decisions Needed

### 1. Certificate Customization
**Question:** Should each path have custom certificate design or standard template?

**Recommendation:** Start with standard template, add customization later if requested
- Standard template with path color/icon is sufficient
- Custom templates add complexity (admin UI, storage)
- Can be added in Phase 6 if needed

### 2. Quiz Passing Requirements
**Question:** Should quiz completion be required for article completion?

**Recommendation:** Make it optional per article
- Default: required_for_completion = false
- Admin can enable for assessment articles
- Allow users to complete article without passing quiz
- Show quiz score separately from article progress

### 3. Sections Display
**Question:** Should sections be collapsed by default?

**Recommendation:** Expand first section, collapse others
- Improves initial load performance
- Users can expand sections as needed
- Remember user's collapse/expand state

### 4. Search Scope
**Question:** Should article search be within current path only or all paths?

**Recommendation:** Both, with UI toggle
- Default: search within current path
- Option: "Search all paths"
- Show which path each result belongs to

---

## Migration Strategy

### Database Migrations

```sql
-- Wave 1: Slides
ALTER TABLE bible_articles ADD COLUMN slide_deck_url TEXT;
ALTER TABLE bible_articles ADD CONSTRAINT slide_deck_url_format
  CHECK (slide_deck_url IS NULL OR slide_deck_url ~* '^https?://');

-- Wave 3: Sections
ALTER TABLE bible_paths ADD COLUMN sections JSONB DEFAULT '[]';
ALTER TABLE bible_paths ADD COLUMN sections JSONB DEFAULT '[]';

-- Wave 4: Certificates
CREATE TABLE bible_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES bible_paths(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  UNIQUE(user_id, path_id)
);

-- Wave 5: Quizzes
ALTER TABLE bible_articles ADD COLUMN quiz_data JSONB;
ALTER TABLE challenge_questions ADD COLUMN bible_article_id UUID REFERENCES bible_articles(id);

CREATE TABLE bible_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES bible_articles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Testing Strategy

### Unit Tests
- TOC extraction logic
- Quiz scoring logic
- Certificate generation
- Search result ranking

### Integration Tests
- Slide embed loads correctly
- Search returns relevant results
- Certificate generates for completed path
- Quiz submission saves to database

### E2E Tests
- Complete user journey with all features
- Admin creates path with all content types
- Certificate download works
- Search across all content types

---

## Rollback Criteria

Each wave can be rolled back if:
- Wave 1: Slides don't render or CSP issues can't be resolved
- Wave 2: Search performance degrades significantly
- Wave 3: Sections cause confusion or UI complexity
- Wave 4: Certificates fail to generate reliably
- Wave 5: Quizzes have data model issues

Rollback procedure:
1. Drop added columns/tables
2. Remove related components
3. Revert API changes
4. Deploy previous version

---

*Research completed: 2026-03-26*
*All technical decisions documented*
