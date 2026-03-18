# query-stream-ai: MC Bible & Knowledge Championship

## What This Is

Internal training and knowledge testing platform for the MC (Marketing/Content) team. Two interconnected features:
1. **MC Bible** — Course/knowledge base with learning paths and articles
2. **Knowledge Championship** — Monthly challenges with leaderboards to test knowledge

Both features integrate with the existing query-stream-ai analytics platform and share admin/role infrastructure.

## Core Value

**MC team can learn, track progress, and compete in knowledge challenges.**

If analytics, pipelines, or other features break — the platform still works. But if MC team cannot learn, track training progress, or participate in challenges — the system fails its primary purpose.

## Requirements

### Validated (Existing Capabilities)

**MC Bible:**
- ✓ Learning paths with titles, descriptions, icons, colors
- ✓ Articles with rich text (TinyMCE), video embeds, file attachments
- ✓ Path detail view with article list
- ✓ Progress tracking (articles read, percentage complete)
- ✓ Manage page for creating/editing paths and articles

**Knowledge Championship:**
- ✓ Challenge creation (name, description, dates, duration, max attempts)
- ✓ Multiple question types: essay, cloze (fill-in-blank), drag-drop
- ✓ CSV bulk upload for questions
- ✓ Challenge taking with timer
- ✓ Leaderboard display
- ✓ Manual grading interface for submissions
- ✓ Attempts tracking per user

**Shared Infrastructure:**
- ✓ Google OAuth authentication via Supabase
- ✓ Role-based access (admin, manager, leader, user)
- ✓ Supabase database with RLS policies
- ✓ Next.js 14 app with App Router

### Active (To Build)

**MC Bible Completion:**

*Admin Interface:*
- [ ] DED-01: Dedicated admin panel for Bible content management
- [ ] DED-02: Role-based permissions for who can create/edit paths and articles

*Organization Features:*
- [ ] DED-03: Sections/categories within learning paths
- [ ] DED-04: Search within articles
- [ ] DED-05: Table of contents navigation for long articles

*Learning Features:*
- [ ] DED-06: Quiz/knowledge check integration with articles
- [ ] DED-07: Completion certificates or badges
- [ ] DED-08: Required vs optional article tracking

**Knowledge Championship Completion:**

*Auto-Grading:*
- [ ] KPC-01: Automated grading for cloze (fill-in-blank) questions
- [ ] KPC-02: Automated grading for drag-drop questions
- [ ] KPC-03: Instant feedback on objective question types

*Question Management:*
- [ ] KPC-04: Question bank/pool system with random selection
- [ ] KPC-05: Question reuse across multiple challenges
- [ ] KPC-06: Question difficulty rating and filtering

*Results & Analytics:*
- [ ] KPC-07: Individual results page showing detailed performance
- [ ] KPC-08: Performance analytics over time (per user and per team)
- [ ] KPC-09: Comparative rankings and improvement tracking

**Admin Integration:**
- [ ] ADM-01: Unified admin interface for both Bible and Challenges management
- [ ] ADM-02: Consistent admin navigation and patterns
- [ ] ADM-03: Shared admin components (forms, tables, dialogs)

### Out of Scope

- **Mobile apps** — Web-first, mobile responsive is sufficient
- **Social features** — Comments, discussions between users (future phase)
- **Advanced analytics** — Deep learning analytics, AI recommendations (future phase)
- **Gamification beyond leaderboards** — Points, badges, streaks (future phase)
- **Public-facing content** — All content is internal to MC team only

## Context

**Existing Codebase:**
- Monorepo with apps/web (main app) and apps/admin (admin interface)
- Duplicate code across apps (needs consolidation)
- Large service files (2,000+ lines) may need refactoring
- Supabase for auth, database, and RLS
- BigQuery for analytics (separate from Bible/Challenges)

**Current State:**
- Bible: `/bible` — functional for users, missing admin
- Challenges: `/challenges` (users) and `/admin/challenges` (admin) — functional
- Need unified admin approach
- Need to complete missing features listed above

**User Roles:**
- **Admin** — Full access to all features and admin panels
- **Manager** — Can manage Bible content and Challenges
- **Leader** — Can grade challenge submissions
- **User** — Can take challenges, read Bible content

## Constraints

- **Technology**: Must use existing Next.js 14, Supabase, TypeScript stack
- **Authentication**: Must integrate with existing Google OAuth via Supabase
- **Database**: Must use Supabase PostgreSQL with RLS
- **Deployment**: Vercel (existing infrastructure)
- **Timeline**: Complete both features for MC team use
- **Compatibility**: Must work alongside existing analytics, pipelines, tools features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Unified admin interface | Consistency, easier maintenance | — Pending |
| Auto-grading for objective questions | Reduces manual grading workload | — Pending |
| Question pools for challenges | Reusability, variety in tests | — Pending |
| Role-based content permissions | Control who can create/edit training | — Pending |

---
*Last updated: 2026-03-18 after project initialization*
