# STATE.md: MC Bible & Knowledge Championship

**Last updated:** 2026-03-18
**Current phase:** Phase 1 (Admin Unification)

## Project Reference

**Core Value:** MC team can learn, track progress, and compete in knowledge challenges.

**What we're building:**
Internal training and knowledge testing platform with two interconnected features:
1. **MC Bible** — Course/knowledge base with learning paths and articles
2. **Knowledge Championship** — Monthly challenges with leaderboards

**Tech Stack:** Next.js 14, Supabase, Radix UI, TypeScript, TanStack Query

## Current Position

**Active Phase:** Phase 1 — Admin Unification
**Plan:** TBD (not yet planned)
**Status:** Not started
**Progress:** 0/3 plans complete

```
[████████████████████████████████████████████████████] 0% Complete
```

### Phase Overview

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Admin Unification | Not started | [ ] 0% |
| 2. Bible Core | Not started | [ ] 0% |
| 3. Challenge Enhancement | Not started | [ ] 0% |
| 4. Recognition & Analytics | Not started | [ ] 0% |

## Performance Metrics

*No metrics yet — project in planning phase*

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Admin unification first | Prevents multiplying technical debt before adding features | 2026-03-18 |
| Auto-grading before question banks | Need graded questions to make them reusable | 2026-03-18 |
| Certificate generation in Phase 4 | jsPDF + html2canvas already installed | 2026-03-18 |

### Technical Notes

**Existing Foundation:**
- Bible: `/bible` — functional for users, missing dedicated admin
- Challenges: `/challenges` (users) and `/admin/challenges` (admin) — functional
- Duplicate admin code across apps/web and apps/admin needs consolidation
- Large service files (2,000+ lines) may need refactoring

**Critical Libraries Already Installed:**
- jsPDF + html2canvas for certificate generation
- TinyMCE for rich text editing
- Recharts for analytics visualizations
- xlsx library for CSV/Excel export

### Known Blockers

None identified yet.

### Research Gaps

**Medium priority research for upcoming phases:**
- jsPDF certificate template patterns (Phase 4)
- Cloze question parsing edge cases (Phase 3)
- Question bank database schema design (Phase 3)

## Session Continuity

**Recent work:**
- 2026-03-18: Project initialized, requirements defined, research completed
- 2026-03-18: Roadmap created with 4 phases

**Next actions:**
1. Plan Phase 1: Admin Unification
2. Execute Phase 1 plans
3. Advance to Phase 2 or 3 (can run in parallel)

**Context for next session:**
- Coarse granularity (4 phases total)
- Phase 2 and 3 can be executed in parallel after Phase 1
- Phase 4 depends on both Phase 2 and 3
- Mode: YOLO (fast iteration)
