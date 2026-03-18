# Stack Research: MC Bible + Knowledge Championship

**Domain:** Learning Management + Quiz/Assessment Platform (Internal Training)
**Researched:** 2026-03-18
**Overall Confidence:** MEDIUM

**Note:** Web search was unavailable during research. Recommendations based on:
- Existing codebase analysis (HIGH confidence)
- Author's knowledge of Next.js/React ecosystem (MEDIUM confidence - requires verification with official docs)
- Standard patterns for learning platforms (MEDIUM confidence - may need phase-specific research)

## Executive Summary

The existing stack is well-suited for learning platform features with minimal additions. Key recommendation: **build custom components** rather than integrating monolithic LMS libraries, which are typically over-engineered for internal training platforms.

**Critical additions:**
1. **Auto-grading engine** for cloze/drag-drop questions (custom implementation)
2. **Certificate generation** using existing jsPDF + html2canvas
3. **Enhanced admin patterns** leveraging existing Radix UI components

**Avoid:** Full LMS frameworks (Moodle clones, Canvas alternatives) — they're designed for external-facing MOOCs with payment gateways, course marketplace, etc.

---

## Recommended Stack

### Core Framework (Existing ✓)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.5.7 | App Router, SSR, API routes | Industry standard for React apps in 2025 |
| React | 18.3.1 | UI library | Concurrent features, stable ecosystem |
| TypeScript | 5.8.3 | Type safety | Catches bugs early, better DX |
| Supabase | 2.75.1 | Auth, database, RLS, storage | Already implemented, PostgreSQL-based |

**Confidence:** HIGH — Verified from existing package.json

### Learning Platform Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Custom implementation** | - | Course delivery, progress tracking | Build using existing patterns |
| **@radix-ui/react-accordion** | ^1.2.11 | Course navigation/sidebar | Already installed, use for table of contents |
| **@radix-ui/react-tabs** | ^1.1.12 | Article sections/chapters | Already installed |
| **@radix-ui/react-progress** | ^1.1.7 | Progress bars for completion | Already installed |
| **date-fns** | ^3.6.0 | Time tracking for articles read | Already installed |

**Confidence:** HIGH — Components verified in packages/ui/, already installed

**Rationale:** Learning platforms for internal training don't need SCORM/xAPI compliance (those are for selling courses to external customers). Build simple article delivery with:
- Rich text viewing (TinyMCE already installed)
- Mark-as-complete tracking (database table exists)
- Progress percentage calculation (DB function exists: `get_path_progress`)

**Avoid:**
- `turf` or other SCORM packages — overkill for internal use
- `react-player` — native `<video>` element is sufficient
- Full LMS frameworks like `Moodle` or `Canvas` clones — wrong paradigm

### Quiz/Assessment Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Custom auto-grading engine** | - | Grade cloze/drag-drop questions | See Implementation Notes below |
| **@dnd-kit/core** | ^6.3.1 | Drag-drop question interaction | Already installed |
| **csv-parse** | ^6.1.0 | Bulk question upload via CSV | Already installed |
| **zod** | ^3.25.76 | Answer validation schema | Already installed |

**Confidence:** HIGH — Verified from existing challenge implementation

**Rationale:** React quiz component libraries (like `react-quiz-component`) are too opinionated and don't support custom question types (cloze, drag-drop). Build custom using:

```typescript
// Use existing @dnd-kit for drag-drop interactions
// Use existing form patterns (react-hook-form + zod)
// Auto-grading implemented as service functions
```

**Auto-grading implementation (cloze questions):**
```typescript
// Parse Moodle-style cloze format: "The capital of {1:France} is Paris"
// Pattern: \{([0-9]+):([^}]+)\}
// Extract correct answers, compare user input (case-insensitive by default)
// Support partial credit for multiple-choice gaps
```

**Auto-grading implementation (drag-drop):**
```typescript
// Compare answer_data.placements with correct_answer.item_zones
// Score = (correct_placements / total_items) * points
```

### Admin Panel Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Existing Radix UI primitives** | - | Build admin UI from scratch | See "What NOT to Use" below |
| **@tanstack/react-query** | ^5.83.0 | Server state, caching | Already installed, use for data fetching |
| **react-hook-form** | ^7.61.1 | Form management | Already installed with zod integration |
| **recharts** | ^2.15.4 | Analytics dashboards | Already installed |

**Confidence:** HIGH — All components verified in packages/ui/

**Rationale:** The project already uses Radix UI primitives (shadcn/ui pattern). Build admin panels using:
- `<Table />` for content listings (paths, articles, challenges)
- `<Dialog />` for create/edit modals
- `<Sheet />` for side panels (article navigation)
- `<Form />` + react-hook-form for all input forms
- `<DataTable />` pattern for filtering/sorting (build custom if needed)

**What NOT to Use:**
- **react-admin** — Overkill, creates monolithic admin, doesn't fit App Router patterns
- **refine** — Same as above, too heavy for simple CRUD
- **keystone** — CMS focused, not for app-specific admin
- **tinaCMS** — Content editing only, not for database management

### Certificate/Badge Generation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **jsPDF** | ^3.0.3 | PDF certificate generation | Already installed ✓ |
| **html2canvas** | ^1.4.1 | HTML→image for certificates | Already installed ✓ |
| **file-saver** | ^2.0.5 | Download certificates | Already installed ✓ |

**Confidence:** HIGH — All three already installed in admin app

**Implementation pattern:**
```typescript
// 1. Create HTML template with user name, path name, date
// 2. Use html2canvas to render as image
// 3. Use jsPDF to create PDF with embedded image
// 4. Use file-saver to trigger download
```

**Avoid:**
- **pdfkit** — Server-side only, adds Edge Runtime complexity
- **@react-pdf/renderer** — Complex styling, html2canvas is simpler
- **puppeteer** — Too heavy for Vercel serverless

### Analytics & Reporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **recharts** | ^2.15.4 | Progress charts, performance analytics | Already installed ✓ |
| **simple-statistics** | ^7.8.8 | Statistical analysis | Already installed ✓ |
| **Supabase queries** | - | Aggregate data from DB | Use for leaderboards, completion rates |

**Confidence:** HIGH — Libraries already present

**Use cases:**
- User progress over time (line chart)
- Challenge score distribution (bar chart)
- Team comparison (grouped bar chart)
- Article completion heatmap (calendar view)

**Avoid:**
- **chart.js** or **victory** — Recharts is already installed
- **D3.js** — Too low-level, Recharts sufficient
- **BigQuery for learning analytics** — Overkill, Supabase PostgreSQL is enough

## Installation

### Core (Already Installed ✓)

```bash
# All core dependencies are already present
# No additional installations required for MVP
```

### Phase-Specific Additions

```bash
# If implementing search functionality (Phase: Bible Search)
pnpm add fuse.js  # Client-side fuzzy search for articles

# If implementing advanced analytics (Phase: Analytics Dashboard)
pnpm add date-fns  # Already installed, use for time-based charts

# If implementing email notifications (Future phase)
pnpm add react-email  # For email templates
pnpm add nodemailer  # Already installed
```

---

## Alternatives Considered

### Full LMS Frameworks vs Custom Build

| Aspect | Custom Build (Recommended) | Full LMS Framework |
|--------|---------------------------|-------------------|
| **Flexibility** | High — exact features needed | Low — many unused features |
| **Learning curve** | Medium — build on existing patterns | High — learn framework conventions |
| **Maintenance** | Low — you own the code | High — framework updates, migrations |
| **Integration** | Seamless — same patterns | Complex — bridge frameworks |
| **Scalability** | Sufficient for internal team (100-500 users) | Designed for 10K+ users |

**Recommendation:** Custom build because:
1. Internal training platform (not commercial)
2. Existing patterns work well
3. No need for SCORM, payments, multi-tenancy
4. Team already knows Next.js/Supabase

### Quiz Libraries vs Custom Components

| Aspect | Custom (Recommended) | Quiz Libraries |
|--------|---------------------|----------------|
| **Question types** | Custom cloze, drag-drop, essay | Usually just multiple choice |
| **Grading** | Custom auto-grading + manual | Typically auto-only |
| **Styling** | Matches existing design system | Requires theming |
| **Data model** | Matches existing DB schema | Requires adapter layer |

**Recommendation:** Custom components because:
1. Existing codebase already has custom question types
2. Need to support CSV bulk upload (not standard in quiz libs)
3. Manual grading workflow requires custom UI

### Admin Panel Approaches

| Aspect | Radix UI Custom (Recommended) | react-admin |
|--------|------------------------------|-------------|
| **Next.js 15 App Router** | Native support | Requires Pages Router workaround |
| **TypeScript** | Full type safety | Any types, weaker guarantees |
| **Learning curve** | Low (team knows Radix) | High (framework-specific) |
| **Bundle size** | Tree-shakeable, small | Large, includes unused features |

**Recommendation:** Build admin using existing Radix UI components:
- Leverage `<Table />`, `<Dialog />`, `<Form />` from packages/ui
- Create reusable admin layouts in `/components/admin/`
- Use shared components across apps/web and apps/admin

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **react-admin** | Not compatible with Next.js App Router, adds framework overhead | Build custom with Radix UI |
| **refine** | Same as react-admin | Build custom with Radix UI |
| **SCORM packages (turf, etc.)** | Internal platform doesn't need LMS standard compliance | Simple progress tracking in DB |
| **react-player** | Native `<video>` element is sufficient | HTML5 `<video>` with Supabase storage |
| **puppeteer** | Too heavy for Vercel serverless, Edge Runtime issues | jsPDF + html2canvas (already installed) |
| **PDFKit** | Server-side only, adds complexity | jsPDF (works client + server) |
| **D3.js** | Too low-level, steep learning curve | Recharts (already installed) |
| **Formik** | React Hook Form already installed | react-hook-form (already installed) |
| **Redux/Zustand** | TanStack Query handles server state | Local state + React Query |
| **next-auth** | Supabase auth already implemented | @supabase/ssr (already installed) |
| **Prisma** | Supabase handles migrations directly | Supabase migrations + TypeScript types |
| **tRPC** | Overkill for this scale, adds complexity | Standard API routes + React Query |

---

## Stack Patterns by Variant

### If building course completion certificates:

**Use:** jsPDF + html2canvas
```typescript
// Create HTML template → render to canvas → embed in PDF
// Works on client-side (no serverless timeout issues)
```

**Why:** Already installed, avoids Edge Runtime crypto issues with PDFKit.

### If implementing article search:

**Use:** Supabase full-text search + PostgreSQL GIN index
```sql
-- Already exists in bible_articles table
CREATE INDEX idx_bible_articles_fulltext ON bible_articles
USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));
```

**Why:** Database already has search index. Use `search_articles()` function.

**Alternative:** fuse.js for client-side fuzzy search if <1000 articles.

### If building quiz auto-grading:

**Use:** Custom grading service
```typescript
// Cloze: Parse Moodle format, compare answers
// Drag-drop: Compare item placements with correct zones
// Essay: Manual grading only
```

**Why:** No library supports custom question types. Build once, reuse.

### If implementing real-time progress updates:

**Use:** Supabase Realtime (already available)
```typescript
// Subscribe to user_progress changes
const subscription = supabase
  .channel('progress_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bible_user_progress',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Update progress UI
  })
  .subscribe()
```

**Why:** Built into Supabase, no additional library needed.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.5.7 | React 18.3.1 | Verified from package.json |
| @supabase/supabase-js 2.75.1 | @supabase/ssr 0.7.0 | Both use same client version |
| @radix-ui/* | All components same major version (1.x) | Compatible, no conflicts |
| react-hook-form 7.61.1 | @hookform/resolvers 3.10.0 | Verified compatible |
| zod 3.25.76 | react-hook-form 7.61.1 | Zod resolver works with RHF |

**Potential issues:**
- Next.js 15 uses React 19 RC, but project uses React 18.3.1 — **OK for now**, monitor for React 19 stable
- @dnd-kit 6.3.1 may have issues with React 19 — **watch for updates**

---

## Implementation Notes

### 1. Learning Platform (MC Bible)

**Already implemented:**
- ✓ Learning paths with progress tracking
- ✓ Rich text articles (TinyMCE)
- ✓ File uploads (Supabase storage)
- ✓ Progress percentage calculation

**To add:**
- Search within articles (use existing DB full-text index)
- Table of contents navigation (use Radix Accordion)
- Quiz integration with articles (reuse challenge questions)
- Completion certificates (jsPDF + html2canvas)

**Database migrations needed:**
- Add `bible_article_quizzes` table (link articles to quiz questions)
- Add `bible_certificates` table (track issued certificates)

### 2. Quiz Auto-Grading

**Cloze questions (fill-in-blank):**
```typescript
// Moodle format: "The capital of {1:France} is Paris"
// Pattern: /{(\d+):([^}]+)}/g
// Extract: gap ID, correct answer(s)
// Support: {1:France} or {1:France~London~Berlin} (multiple choice)
// Scoring: Exact match (case-insensitive) or partial credit for MC
```

**Drag-drop questions:**
```typescript
// Compare user's answer_data.placements with correct_answer
// Score = (correctly_placed_items / total_items) * points
// Allow partial credit: 50% for half-correct placements
```

**Essay questions:**
- Manual grading only (no auto-grading)
- Use existing `manual_score`, `manual_feedback` fields

### 3. Admin Panel Unification

**Current state:**
- apps/web has admin at `/admin/challenges`
- apps/admin has separate admin app
- Duplicate code across apps

**Recommended approach:**
- Build unified admin in apps/web `/admin` (existing)
- Move apps/admin functionality to apps/web
- Delete apps/admin after migration
- Create shared admin components in `/packages/admin`

**Shared components:**
- `<AdminTable />` — Generic table with filtering/sorting
- `<AdminForm />` — Form builder with react-hook-form
- `<AdminDialog />` — Modal for create/edit
- `<AdminLayout />` — Sidebar + header layout

---

## Sources

### High Confidence
- **Existing codebase analysis** — All package.json files verified (2026-03-18)
- **Database schema review** — All migrations read and understood (2026-03-18)
- **Type definitions** — packages/types/ reviewed (2026-03-18)

### Medium Confidence
- **Author's knowledge of Next.js ecosystem** — Based on training data (6-18 months stale, may need verification)
- **Standard React patterns** — Requires verification with official docs

### Low Confidence (Web Search Failed)
- **Specific learning platform libraries** — Web search unavailable, recommendations based on general ecosystem knowledge
- **Quiz library comparison** — No current sources, verify with npm trends and GitHub stars

### Verification Needed
1. **Next.js 15 + React 18 compatibility** — Check official Next.js docs for React 19 roadmap
2. **@dnd-kit React 19 support** — Monitor @dnd-kit GitHub for updates
3. **jsPDF features** — Verify jsPDF docs for certificate template capabilities
4. **Supabase Realtime limits** — Check Supabase docs for connection limits

### Recommended Next Steps
1. Verify jsPDF certificate generation with a simple prototype
2. Build cloze auto-grading as standalone service (test with examples)
3. Create admin table component prototype (reusable pattern)
4. Research: "Next.js 15 App Router admin panel best practices" (when web search available)

---

*Stack research for: MC Bible + Knowledge Championship*
*Researched: 2026-03-18*
*Web search unavailable — recommendations based on codebase analysis + author knowledge*
