# Feature Landscape: Learning & Quiz Platforms

**Domain:** Internal Training Platform (MC Team)
**Researched:** 2026-03-18
**Overall Confidence:** MEDIUM

## Table Stakes

Features users expect in learning and quiz platforms. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Rich text articles** | Knowledge delivery requires formatted content | Low | TinyMCE already installed ✓ |
| **Progress tracking** | Users need to know what they've completed | Low | DB tables exist (bible_user_progress) ✓ |
| **Progress bars** | Visual completion indicator | Low | Radix Progress component exists ✓ |
| **Quiz taking interface** | Knowledge assessment requires questions | Medium | Challenge system already exists ✓ |
| **Manual grading** | Subjective questions need human review | Medium | Grading interface exists ✓ |
| **Leaderboards** | Competition element for knowledge testing | Medium | Leaderboard queries exist ✓ |
| **Role-based access** | Admin vs user permissions | Low | RBAC system exists ✓ |
| **File attachments** | Supporting documents for learning | Low | Supabase storage exists ✓ |
| **Search** | Find specific articles/knowledge | Medium | Full-text index exists in DB ✓ |
| **Responsive design** | Mobile/tablet access | Low | Tailwind CSS + Radix UI ✓ |

**Status:** Most table stakes already implemented in existing codebase.

## Differentiators

Features that set product apart. Not expected in basic platforms, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom question types (cloze, drag-drop)** | Beyond multiple choice, tests deeper understanding | High | Already implemented, needs auto-grading |
| **Monthly challenge format** | Regular knowledge testing cadence | Low | Challenge system exists ✓ |
| **Team-based grading** | Leaders grade their team members | Medium | user_team_assignments table exists ✓ |
| **CSV bulk upload** | Efficient question creation | Medium | CSV parsing exists ✓ |
| **Internal-only focus** | No public access, security through obscurity | N/A | Already enforced via auth ✓ |
| **Integrated learning + testing** | Read articles, then quiz on content | Medium | Need to link Bible to Challenges |
| **Completion certificates** | Achievement recognition, gamification | Medium | jsPDF + html2canvas installed ✓ |
| **Performance analytics** | Track improvement over time | High | Recharts installed, needs implementation |

**Status:** Differentiators partially implemented. Auto-grading and analytics are the missing pieces.

## Anti-Features

Features to explicitly NOT build for internal training platform.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Payment gateways** | Internal platform, no course sales | Free access for all authenticated users |
| **Course marketplace** | Not a public LMS, internal content only | Admin-controlled content creation |
| **Social features (comments, discussions)** | Out of scope for MVP | Use existing team communication tools (Slack, etc.) |
| **Mobile apps** | Web-first, mobile-responsive is sufficient | Responsive web design |
| **SCORM/xAPI compliance** | Internal platform doesn't need LMS standards | Custom progress tracking in DB |
| **Multi-tenancy** | Single organization (MC team) | Single tenant with role-based access |
| **Advanced gamification (points, streaks)** | Leaderboards provide sufficient competition | Keep simple: leaderboard + certificates |
| **AI recommendations** | Overkill for internal training | Manual curation of learning paths |
| **Video hosting** | Use existing solutions (YouTube, Vimeo) | Embed external videos via URL |
| **Live proctoring** | Internal trust, no need for anti-cheating | Honor system + manual review |

**Rationale:** Internal training platforms serve a different purpose than commercial MOOCs. Focus on knowledge delivery and assessment, not engagement mechanics or monetization.

## Feature Dependencies

```
Bible Articles → Progress Tracking → Completion Certificates
                    ↓
              Quiz Integration → Auto-Grading → Instant Feedback
                    ↓
              Challenge Taking → Manual Grading → Leaderboards
                    ↓
              Performance Analytics ← Question Banks
```

**Critical path:**
1. Bible articles must exist before tracking progress
2. Progress must exist before certificates
3. Questions must exist before auto-grading
4. Auto-grading must exist before instant feedback
5. Challenges must exist before leaderboards
6. Data must exist before analytics

**MVP Recommendation:**

**Phase 1 (Must-have):**
1. Rich text articles delivery (already exists) ✓
2. Progress tracking (already exists) ✓
3. Quiz taking interface (already exists) ✓
4. Manual grading (already exists) ✓
5. Leaderboards (already exists) ✓

**Phase 2 (Should-have):**
1. Auto-grading for cloze questions (reduces manual work)
2. Auto-grading for drag-drop questions (reduces manual work)
3. Search within articles (findability)
4. Completion certificates (achievement)

**Phase 3 (Nice-to-have):**
1. Question banks (reusability)
2. Question difficulty ratings (targeted challenges)
3. Individual results page (detailed feedback)
4. Performance analytics (improvement tracking)
5. Comparative rankings (benchmarking)

**Defer:**
- Email notifications (use existing comms tools)
- Advanced gamification (leaderboards sufficient)
- Discussion forums (use Slack)
- Mobile apps (responsive web is enough)

## Learning Platform Features

### Course/Path Delivery

| Feature | Status | Notes |
|---------|--------|-------|
| Learning paths with icons/colors | ✓ Implemented | bible_paths table |
| Article list within paths | ✓ Implemented | bible_path_articles table |
| Rich text content | ✓ Implemented | TinyMCE editor |
| Video embeds | ✓ Implemented | video_url field |
| File attachments | ✓ Implemented | Supabase storage |
| Progress percentage | ✓ Implemented | get_path_progress() DB function |
| Required vs optional articles | ✗ Not implemented | is_required field exists but not used |
| Search within articles | ✗ Not implemented | Full-text index exists, needs UI |
| Table of contents | ✗ Not implemented | Use Radix Accordion |
| Quiz integration | ✗ Not implemented | Need to link articles to challenges |

**Gap analysis:** Core delivery is solid. Missing: navigation (TOC), search, quiz integration.

### Progress Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Mark article as complete | ✓ Implemented | bible_user_progress table |
| Progress bar visualization | ✓ Implemented | Radix Progress component |
| Path completion percentage | ✓ Implemented | DB function exists |
| Continue reading button | ✗ Not implemented | UX feature |
| Reading history | ✗ Not implemented | Query completed articles |
| Streak tracking | ✗ Not implemented | Out of scope (gamification) |
| Time spent tracking | ✗ Not implemented | Could add analytics |

**Gap analysis:** Tracking works, but lacks user-friendly UX for "continue where I left off."

### Assessment Features

| Feature | Status | Notes |
|---------|--------|-------|
| Multiple question types | ✓ Implemented | Essay, cloze, drag-drop |
| Challenge creation | ✓ Implemented | Full CRUD + CSV upload |
| Timer during quiz | ✓ Implemented | Duration enforcement |
| Attempts tracking | ✓ Implemented | max_attempts field |
| Manual grading interface | ✓ Implemented | Grading page exists |
| Team-based grading | ✓ Implemented | Leaders grade team members |
| Leaderboard display | ✓ Implemented | Ranking by score |
| Instant feedback | ✗ Not implemented | Requires auto-grading |
| Auto-grading cloze | ✗ Not implemented | Need parsing logic |
| Auto-grading drag-drop | ✗ Not implemented | Need placement comparison |
| Question pools | ✗ Not implemented | Need many-to-many schema |
| Question reuse | ✗ Not implemented | Need question bank |
| Difficulty ratings | ✗ Not implemented | Need difficulty field |

**Gap analysis:** Quiz framework is solid. Missing: auto-grading, question management.

### Admin Features

| Feature | Status | Notes |
|---------|--------|-------|
| Bible content management | Partial Implemented | Exists in apps/web, missing in apps/admin |
| Challenge management | ✓ Implemented | Full admin interface |
| User management | ✓ Implemented | Users table + RBAC |
| Role-based permissions | ✓ Implemented | RBAC system exists |
| Team assignments | ✓ Implemented | user_team_assignments table |
| Content approval workflow | ✗ Not implemented | Direct publish, no review |
| Bulk operations | ✓ Implemented | CSV upload for questions |
| Analytics dashboard | ✗ Not implemented | Recharts installed, needs build |

**Gap analysis:** Admin is functional but inconsistent across apps. Need unification.

## Quiz/Challenge Features

### Question Types

| Question Type | Status | Auto-Grading | Complexity | Notes |
|---------------|--------|--------------|------------|-------|
| **Essay** | ✓ Implemented | ✗ Manual only | Low | Subjective, requires human review |
| **Cloze (fill-in-blank)** | ✓ Implemented | ✗ Manual only | Medium | Needs Moodle format parser |
| **Drag-drop** | ✓ Implemented | ✗ Manual only | High | Needs placement comparison |
| **Multiple choice** | ✗ Not implemented | ✓ Easy | Low | Use cloze with single gap as workaround |
| **True/False** | ✗ Not implemented | ✓ Easy | Low | Use cloze with {1:T~F} format |
| **Matching** | ✗ Not implemented | ✓ Medium | Medium | Use drag-drop as workaround |
| **Ordering** | ✗ Not implemented | ✓ Easy | Low | Use drag-drop with numbered zones |

**Gap analysis:** Current 3 types cover most use cases. Auto-grading is the missing piece.

**Recommendation:** Keep current 3 types. Add auto-grading before adding new types.

### Grading System

| Feature | Status | Notes |
|---------|--------|-------|
| Manual grading interface | ✓ Implemented | Grading page exists |
| Essay questions | ✓ Manual grading | Requires human review |
| Cloze questions | ✗ Manual only (auto planned) | Need parser |
| Drag-drop questions | ✗ Manual only (auto planned) | Need comparison logic |
| Partial credit support | ✗ Not implemented | Could add to auto-grader |
| Rubric-based grading | ✗ Not implemented | Overkill for internal use |
| Grade override | ✗ Not implemented | Manager override exists in DB schema |
| Grading queue | ✓ Implemented | Shows ungraded essays |

**Gap analysis:** Grading workflow exists. Auto-grading reduces manual workload.

### Analytics & Reporting

| Feature | Status | Notes |
|---------|--------|-------|
| Individual student performance | ✗ Not implemented | Need results page |
| Class-wide statistics | ✗ Not implemented | Need aggregation queries |
| Question difficulty analysis | ✗ Not implemented | Need to track pass rates |
| Time-based analytics | ✗ Not implemented | Challenge has time_spent |
| Progress monitoring | ✗ Not implemented | Bible has progress, needs dashboard |
| Exportable reports | ✓ Partial implemented | xlsx library installed |
| Visual dashboards | ✗ Not implemented | Recharts installed |

**Gap analysis:** No analytics yet. All building blocks exist (Recharts, DB data).

## Admin/Content Management

### Bible Content Management

| Feature | Status | Priority |
|---------|--------|----------|
| Create/edit learning paths | ✓ Implemented | High |
| Create/edit articles | ✓ Implemented | High |
| Rich text editor | ✓ Implemented (TinyMCE) | High |
| File uploads | ✓ Implemented | High |
| Reorder articles in path | ✓ Implemented | Medium |
| Article search | ✗ Not implemented | Medium |
| Duplicate article | ✗ Not implemented | Low |
| Article versioning | ✗ Not implemented | Low |
| Bulk import articles | ✗ Not implemented | Low |

**Gap analysis:** Core CMS exists. Missing: search, convenience features.

### Challenge/Question Management

| Feature | Status | Priority |
|---------|--------|----------|
| Create/edit challenges | ✓ Implemented | High |
| Create/edit questions | ✓ Implemented | High |
| Bulk CSV upload | ✓ Implemented | High |
| Question preview | ✗ Not implemented | Medium |
| Question bank | ✗ Not implemented | Medium |
| Question reuse | ✗ Not implemented | Medium |
| Question tagging | ✗ Not implemented | Medium |
| Difficulty ratings | ✗ Not implemented | Low |
| Question versioning | ✗ Not implemented | Low |
| Duplicate question | ✗ Not implemented | Low |

**Gap analysis:** CRUD exists. Missing: organization (banks, tags), reusability.

## MVP Feature Prioritization

### Bible MVP (Core Learning Platform)

**Must-have (P0):**
1. ✓ Learning paths with articles
2. ✓ Rich text content delivery
3. ✓ Progress tracking
4. ✓ Basic admin (create/edit paths and articles)
5. ✗ Search within articles

**Should-have (P1):**
1. ✗ Table of contents navigation
2. ✗ Quiz integration (link articles to questions)
3. ✗ Completion certificates
4. ✗ Required vs optional article tracking

**Nice-to-have (P2):**
1. ✗ Article versioning
2. ✗ Duplicate article
3. ✗ Bulk import
4. ✗ Advanced search filters

### Challenge MVP (Core Quiz Platform)

**Must-have (P0):**
1. ✓ Challenge creation
2. ✓ Question types (essay, cloze, drag-drop)
3. ✓ Quiz taking interface
4. ✓ Manual grading
5. ✓ Leaderboards

**Should-have (P1):**
1. ✗ Auto-grading cloze
2. ✗ Auto-grading drag-drop
3. ✗ Instant feedback
4. ✗ Question bank

**Nice-to-have (P2):**
1. ✗ Question difficulty ratings
2. ✗ Question reuse
3. ✗ Individual results page
4. ✗ Performance analytics

## Sources

### High Confidence
- **Existing codebase analysis** — All features verified from database schemas and type definitions
- **Database migrations** — 20260223_create_bible_tables.sql, 20260120_create_challenges.sql

### Medium Confidence
- **Author's knowledge of LMS platforms** — Based on training data (6-18 months stale)
- **Industry standard features** — May need verification with current LMS platforms

### Low Confidence (Web Search Unavailable)
- **Competitor feature analysis** — Could not verify what competitors offer
- **User expectation research** — No data on actual user needs

### Verification Needed
1. **MC team user interviews** — What features do they actually need?
2. **Competitor analysis** — What do similar internal training platforms offer?
3. **Usage patterns** — How often do users take challenges? Complete articles?

---

*Feature research for: MC Bible + Knowledge Championship*
*Researched: 2026-03-18*
*Web search unavailable — findings based on codebase analysis and author knowledge*
