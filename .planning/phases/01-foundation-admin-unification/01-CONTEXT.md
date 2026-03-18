# Phase 1: Foundation + Admin Unification - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidate duplicate admin apps (`apps/admin` and `apps/web`) into a single unified admin interface within the main app. Create shared admin components and patterns that all future phases (Bible admin, notifications, dashboard, etc.) will use.

**Key decision:** Merge into ONE app, not separate. Deploy as ONE Vercel project.

</domain>

<decisions>
## Implementation Decisions

### Deployment strategy
- **Single app approach** — Merge `apps/admin` INTO `apps/web`, not separate
- **One Vercel project** — One URL, one deployment, one bill
- **Shared authentication** — Users stay logged in when navigating between main app and admin

### Route structure
```
/app/(protected)/admin/
├── page.tsx                    — Admin overview/home (exists)
├── layout.tsx                  — Admin layout with sidebar (exists)
├── overview/                   — Dashboard (Phase 4) — NEW
├── bible/                      — Bible content management (Phase 5) — NEW
│   ├── paths/                  — Learning paths CRUD
│   └── articles/               — Articles CRUD
├── challenges/                 — Challenge management (exists)
│   ├── page.tsx                — List challenges
│   └── [id]/                   — Edit challenge, grading
├── users/                      — User management (exists)
├── ai-usage/                   — AI cost monitoring (exists)
├── feedback/                   — Feedback admin (exists)
└── team-settings/              — Team settings (exists)
```

### Component organization
- **Shared admin components**: `app/components/admin/`
  - `AdminSidebar.tsx` — Unified sidebar (merge from both apps)
  - `AdminHeader.tsx` — Common header pattern
  - `AdminTable.tsx` — Reusable data table
  - `AdminForm.tsx` — Reusable form wrapper
  - `AdminDialog.tsx` — Reusable dialog/modal
- **Role-based access** — Use existing role system (admin, manager, leader, member)

### Migration approach
1. **Copy admin pages** from `apps/admin/app/admin/*` → `app/(protected)/admin/*`
2. **Copy admin APIs** from `apps/admin/app/api/admin/*` → `app/api/admin/*`
3. **Standardize imports** — Use `@/components/ui/*` pattern (not `@query-stream-ai/ui/*`)
4. **Merge duplicates** — Keep the best version of each component
5. **Delete `apps/admin`** — After verification

### Import path standardization
- **Use**: `@/components/ui/badge` (from apps/web pattern)
- **Remove**: `@query-stream-ai/ui/badge` (from apps/admin pattern)
- **Reason**: Consistency with main app, simpler imports

### Environment config
- **Merge** `apps/admin/.env.local` into root `.env.local` or `.env.local.example`
- **Remove** separate `apps/admin` environment config
- **Shared** Supabase and auth config across whole app

### Deletion timing
- **Delete `apps/admin` after**:
  1. All pages migrated to `app/(protected)/admin`
  2. All APIs migrated to `app/api/admin`
  3. Components verified working
  4. Import paths standardized
- **No backup kept** — Use git history if needed

### Claude's Discretion
- Exact component file structure within `app/components/admin/`
- Whether to keep `app/api/admin/feedback` (may not be used)
- Styling consistency tweaks during migration
- Internal component implementation details (hooks, state management patterns)

</decisions>

<specifics>
## Specific Ideas

- User said "yes proceed planning" — approve the single app merge approach
- Keep existing admin features intact during migration (challenges, users, AI usage, feedback, team settings)
- Route structure should accommodate Phase 4 (dashboard) and Phase 5 (Bible admin)
- Use existing shadcn/ui components from `app/components/ui/` for consistency

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` §Phase 1 — Phase goal, requirements (ADM-01 to ADM-06), success criteria
- `.planning/REQUIREMENTS.md` §Phase 1 — Detailed requirements for admin unification

### Project context
- `.planning/PROJECT.md` — Core value, constraints, existing capabilities
- `.planning/STATE.md` — Current progress, technical notes

### Codebase patterns
- `.planning/codebase/STRUCTURE.md` — Where to place new code
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import order, error handling
- `.planning/codebase/ARCHITECTURE.md` — Layers, data flow, context providers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **shadcn/ui components**: `app/components/ui/` — Badge, Button, Card, Dialog, Form, Table, etc.
- **Existing admin pages**: `app/(protected)/admin/` — challenges, ai-usage, feedback, users, team-settings
- **Existing admin APIs**: `app/api/admin/` — users, ai-usage, feedback endpoints
- **Admin layouts**: `app/(protected)/admin/layout.tsx`, `apps/admin/app/admin/layout.tsx` (duplicate)
- **Admin sidebars**: Two nearly identical `AdminSidebar.tsx` files to merge

### Established Patterns
- **Protected routes**: `app/(protected)/` route group for authenticated pages
- **API routes**: `app/api/` with RESTful organization by domain
- **Context providers**: `app/contexts/AuthContext.tsx` for authentication
- **TanStack Query**: Used for data fetching (via `@tanstack/react-query`)
- **Supabase auth**: JWT-based with Google OAuth
- **Error handling**: Try-catch with `[Module] Context` logging prefix

### Integration Points
- **Middleware**: `middleware.ts` — Route protection, authentication checks
- **Auth context**: `app/contexts/AuthContext.tsx` — User state, role access
- **Supabase client**: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- **Main app layout**: `app/layout.tsx` — Global providers

### Duplication to Resolve
- `apps/admin/app/admin/AdminSidebar.tsx` ↔ `app/(protected)/admin/AdminSidebar.tsx` (99% identical)
- `apps/admin/app/admin/challenges/` ↔ `app/(protected)/admin/challenges/` (likely duplicates)
- `apps/admin/middleware.ts` ↔ root `middleware.ts`
- Separate `.env.local` files
- Separate `node_modules` and dependencies

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-admin-unification*
*Context gathered: 2026-03-18*
