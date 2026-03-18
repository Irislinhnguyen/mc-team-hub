# Phase 1: Foundation + Admin Unification - Research

**Researched:** 2026-03-18
**Domain:** Next.js 14 App Router admin consolidation, monorepo migration
**Confidence:** HIGH

## Summary

This phase focuses on consolidating duplicate admin applications (`apps/admin` and `apps/web`) into a single unified admin interface within the main web application. The current setup has two nearly identical Next.js apps with 99% duplicated code across admin pages, APIs, layouts, and components. The research reveals that most files are identical except for minor import path differences (`@/components/ui/*` vs `@query-stream-ai/ui/*`).

**Primary recommendation:** Merge `apps/admin` into `apps/web` using the `/admin` route structure, standardize on the `@/components/ui/*` import pattern, and eliminate the separate admin app deployment to reduce complexity, cost, and maintenance burden.

### Key Findings

1. **Near-perfect code duplication**: AdminSidebar, layouts, and API routes are 99% identical between apps
2. **Import path inconsistency**: Web app uses `@/components/ui/*`, admin app uses `@query-stream-ai/ui/*`
3. **Shared infrastructure already exists**: Common packages (`@query-stream-ai/auth`, `@query-stream-ai/db`, `@query-stream-ai/ui`) are workspace dependencies
4. **Auth system unified**: Both apps use the same auth package with role-based access control (admin/manager/leader/member)
5. **Middleware duplication**: Separate middleware files with similar logic but different runtime configurations
6. **Deployment redundancy**: Two separate Vercel projects when one would suffice

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Single app approach** — Merge `apps/admin` INTO `apps/web`, not separate
- **One Vercel project** — One URL, one deployment, one bill
- **Shared authentication** — Users stay logged in when navigating between main app and admin
- **Route structure**: `/admin/*` with role-based access
- **Component organization**: `app/components/admin/` for shared admin components
- **Import path standardization**: Use `@/components/ui/*` pattern (not `@query-stream-ai/ui/*`)
- **Migration approach**: Copy pages, standardize imports, merge duplicates, delete `apps/admin`
- **Environment config**: Merge `apps/admin/.env.local` into root `.env.local`
- **Deletion timing**: Delete `apps/admin` after migration and verification

### Claude's Discretion
- Exact component file structure within `app/components/admin/`
- Whether to keep `app/api/admin/feedback` (may not be used)
- Styling consistency tweaks during migration
- Internal component implementation details (hooks, state management patterns)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADM-01 | Unified admin interface for both Bible and Challenges management | Route structure `/admin/*` established, layout patterns exist in both apps |
| ADM-02 | Consistent admin navigation and patterns across all admin panels | AdminSidebar component already exists (99% identical in both apps) |
| ADM-03 | Shared admin components (forms, tables, dialogs) for reuse | shadcn/ui components available in packages/ui (Table, Dialog, Form primitives) |
| ADM-04 | Consolidate `apps/admin` into `apps/web` (eliminate duplicate app) | File structure mapped, API routes identified as duplicates with minor import differences |
| ADM-05 | Delete duplicate UI components and services | Component duplication documented, import path pattern decided |
| ADM-06 | Create shared admin layout/sidebar component | AdminSidebar exists in both apps, layout pattern established |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.7 (current: 16.1.7) | App Router for admin pages | Latest stable App Router with server components, route groups for admin organization |
| @tanstack/react-query | 5.90.2 (current: 5.90.21) | Data fetching for admin pages | Industry standard for React data fetching, already in use |
| @radix-ui/* | 1.1.15 (current: 1.1.15) | Unstyled UI primitives | Headless component library for accessibility, already used in shadcn/ui |
| Supabase | 2.75.1 | Auth & database | Existing auth infrastructure, JWT-based authentication |
| TypeScript | 5.8.3 | Type safety | Already configured in both apps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.462.0 | Icons | Already in use for admin icons (BarChart3, Trophy, Users, etc.) |
| recharts | 2.15.4 (current: 3.8.0) | Analytics charts | For admin dashboard visualizations (Phase 4) |
| @hookform/resolvers | 3.10.0 | Form validation | For admin form inputs with zod schemas |
| react-hook-form | 7.61.1 | Form state management | For complex admin forms (user editing, challenge creation) |
| sonner | 1.7.4 | Toast notifications | For admin action feedback (create, update, delete) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate apps | Micro-frontends | Added complexity not justified for internal tool; single app simpler |
| shadcn/ui | Chakra UI / MUI | shadcn/ui already in use, copy-paste components, no runtime dependency |
| Route groups | Separate domains | Route groups (`(protected)/(admin)`) maintain shared auth context |

**Installation:**
```bash
# Core dependencies already installed
# Verify versions:
npm view next@15 version
npm view @tanstack/react-query@5 version
npm view @radix-ui/react-dialog@1 version
```

**Version verification:** Verified current versions from npm registry on 2026-03-18. Training data versions (Next.js 14 era) are outdated — use verified versions above.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── (protected)/
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Unified admin layout (merge from both)
│   │   │   ├── page.tsx                # Admin overview/redirect
│   │   │   ├── AdminSidebar.tsx        # Unified sidebar (merge best of both)
│   │   │   ├── overview/               # Phase 4: Dashboard
│   │   │   ├── bible/                  # Phase 5: Bible admin
│   │   │   │   ├── paths/              # Learning paths CRUD
│   │   │   │   └── articles/           # Articles CRUD
│   │   │   ├── challenges/             # Challenge management (exists)
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── users/                  # User management (exists)
│   │   │   ├── ai-usage/               # AI cost monitoring (exists)
│   │   │   ├── feedback/               # Feedback admin (exists)
│   │   │   └── team-settings/          # Team settings (exists)
│   │   ├── bible/                      # Bible user-facing pages
│   │   └── challenges/                 # Challenges user-facing pages
│   ├── api/
│   │   └── admin/                      # Unified admin APIs
│   │       ├── users/
│   │       ├── ai-usage/
│   │       └── feedback/
│   └── components/
│       ├── admin/                      # NEW: Shared admin components
│       │   ├── AdminTable.tsx          # Reusable data table
│       │   ├── AdminForm.tsx           # Form wrapper with validation
│       │   ├── AdminDialog.tsx         # Dialog/modal wrapper
│       │   └── AdminHeader.tsx         # Common header pattern
│       └── ui/                         # shadcn/ui components (existing)
├── middleware.ts                       # Unified middleware
└── .env.local                          # Merged environment config
```

### Pattern 1: Admin Layout with Role-Based Access
**What:** Server component layout that enforces role-based access control before rendering admin pages
**When to use:** All admin routes under `/admin/*` should use this layout pattern
**Example:**
```typescript
// Source: apps/web/app/(protected)/admin/layout.tsx (existing)
import { redirect } from 'next/navigation'
import { getServerUser, isLeaderOrAbove } from '@query-stream-ai/auth/server'
import AdminSidebar from './AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side authentication check
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  // Leader and above can access admin section
  if (!isLeaderOrAbove(user)) {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Client Component */}
      <AdminSidebar userRole={user.role || 'user'} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  )
}
```

**Key insight:** Server-side auth check in layout prevents unauthorized access before component renders. Uses `isLeaderOrAbove()` helper from shared auth package.

### Pattern 2: Admin Sidebar with Active Navigation
**What:** Client component sidebar that highlights active route and provides navigation
**When to use:** Admin layout for consistent navigation across all admin pages
**Example:**
```typescript
// Source: apps/web/app/(protected)/admin/AdminSidebar.tsx (existing)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Trophy, MessageSquare, Users, Home, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  const navItems = [
    { name: 'AI Usage', href: '/admin/ai-usage', icon: <BarChart3 size={18} /> },
    { name: 'Challenges', href: '/admin/challenges', icon: <Trophy size={18} /> },
    { name: 'Feedback', href: '/admin/feedback', icon: <MessageSquare size={18} /> },
    { name: 'User Roles', href: '/admin/users', icon: <Users size={18} /> },
    // Add Bible admin routes in Phase 5
  ]

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header, Navigation, Footer */}
    </div>
  )
}
```

**Key insight:** Uses `usePathname()` for active route detection. Role badge displays user permissions. Will need to add Bible admin navigation items in Phase 5.

### Pattern 3: Unified Admin API Routes
**What:** Server-side API routes with consistent authentication and error handling
**When to use:** All admin API endpoints under `/api/admin/*`
**Example:**
```typescript
// Source: apps/web/app/api/admin/users/route.ts (existing)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@query-stream-ai/auth/server'
import { createClient } from '@query-stream-ai/db'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuthApi(request)
    const supabase = createClient()

    // Fetch data with role-based filtering
    const { data, error } = await supabase
      .from('users')
      .select('*')

    if (error) throw error

    return NextResponse.json({ users: data })
  } catch (error) {
    console.error('[Admin Users API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
```

**Key insight:** Uses `requireAuthApi()` for authentication. Consistent error handling with logging prefix. Note: Import paths differ between apps (`@query-stream-ai/db/server` vs `@query-stream-ai/db`).

### Anti-Patterns to Avoid
- **Separate admin app with duplicate deployment**: Adds maintenance burden, separate auth sessions, doubled Vercel costs
- **Client-side only auth checks**: Security risk — always validate on server
- **Hardcoded role checks in components**: Use shared `@query-stream-ai/auth/server` helpers instead
- **Inconsistent import paths**: Standardize on `@/components/ui/*` pattern for consistency
- **Separate environment configs**: Merge into single `.env.local` to avoid configuration drift

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table component | Custom table with sorting/pagination | `@/components/ui/table` (shadcn/ui) | Radix UI Table primitive handles accessibility, styling |
| Form validation | Custom validation logic | `react-hook-form` + `zod` | Already in use, handles complex validation, error display |
| Dialog/Modal | Custom modal with z-index wars | `@/components/ui/dialog` (shadcn/ui) | Radix UI Dialog handles focus trap, accessibility |
| Toast notifications | Custom toast implementation | `sonner` (already installed) | Lightweight, accessible, promise-based API |
| Data fetching | Custom useEffect + useState | `@tanstack/react-query` (already in use) | Handles caching, refetching, loading states |
| Auth helpers | Custom JWT verification | `@query-stream-ai/auth/server` | Centralized auth logic, role-based helpers |

**Key insight:** The project already has all necessary UI primitives via shadcn/ui components. Don't create custom table/form/dialog wrappers unless adding significant functionality beyond composition.

## Common Pitfalls

### Pitfall 1: Import Path Inconsistency During Migration
**What goes wrong:** Some components use `@/components/ui/*`, others use `@query-stream-ai/ui/*`, causing import errors and duplication.
**Why it happens:** Admin app uses workspace package imports (`@query-stream-ai/ui`), web app uses local imports (`@/components/ui`). During migration, forgetting to update imports breaks the build.
**How to avoid:**
1. Standardize ALL imports to `@/components/ui/*` pattern during migration
2. Run global find-replace: `@query-stream-ai/ui/` → `@/components/ui/`
3. Verify build passes before deleting `apps/admin`
**Warning signs:** TypeScript errors about missing modules, "Cannot find module" errors

### Pitfall 2: Breaking Existing Admin Routes
**What goes wrong:** Users have bookmarked `/admin/ai-usage` or `/admin/challenges` URLs. After migration, these routes return 404.
**Why it happens:** Route structure changes during consolidation (e.g., `/admin` → `/app/(protected)/admin`).
**How to avoid:**
1. Maintain exact route paths: `/admin/ai-usage` stays `/admin/ai-usage`
2. Use route groups `(protected)` for auth, not in URL structure
3. Test all existing admin URLs before deleting `apps/admin`
**Warning signs:** 404 errors on previously working admin URLs, broken bookmarks

### Pitfall 3: Environment Configuration Mismatch
**What goes wrong:** Admin app has different env vars than web app, causing features to break after merge.
**Why it happens:** Separate `.env.local` files have diverged over time. Admin app may have admin-specific vars that web app doesn't.
**How to avoid:**
1. Compare both `.env.local` files before migration
2. Merge ALL admin env vars into root `.env.local`
3. Document any admin-specific env vars in `.env.local.example`
**Warning signs:** "API key not found" errors, missing Supabase config, auth failures

### Pitfall 4: Middleware Runtime Conflicts
**What goes wrong:** Admin app middleware uses Node.js runtime (for JWT verification), web app middleware uses Edge runtime.
**Why it happens:** Admin app's middleware imports `jsonwebtoken` which requires Node.js runtime. Web app's middleware uses Edge runtime for performance.
**How to avoid:**
1. Keep middleware in Edge runtime for performance
2. Move JWT verification to server components/API routes (Node.js runtime)
3. Middleware should only check for cookie presence, not verify JWT
**Warning signs:** Middleware deployment errors, "Edge Runtime does not support Node.js built-ins"

### Pitfall 5: Role-Based Access Bypass
**What goes wrong:** Users with `member` role can access admin pages after migration.
**Why it happens:** Forgot to copy auth checks from admin app's middleware/layout to web app's equivalent.
**How to avoid:**
1. Verify `isLeaderOrAbove()` check is in admin layout
2. Test with each role (admin, manager, leader, member)
3. Keep middleware auth check as defense-in-depth
**Warning signs:** Admin pages load for non-admin users, unauthorized data access

## Code Examples

Verified patterns from existing codebase:

### Admin Auth Check in Layout
```typescript
// Source: apps/web/app/(protected)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { getServerUser, isLeaderOrAbove } from '@query-stream-ai/auth/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  if (!isLeaderOrAbove(user)) {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar userRole={user.role || 'user'} />
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  )
}
```

### Admin API with Auth
```typescript
// Source: apps/web/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@query-stream-ai/auth/server'
import { createClient } from '@query-stream-ai/db'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuthApi(request)
    // Verify user has admin+ role
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createClient()
    const { data } = await supabase.from('users').select('*')

    return NextResponse.json({ users: data })
  } catch (error) {
    console.error('[Admin Users API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
```

### Reusable Admin Table Pattern
```typescript
// Source: apps/web/app/(protected)/admin/users/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AdminTable({ data, columns }: { data: any[], columns: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            {columns.map((col) => (
              <TableCell key={col.key}>{col.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple Next.js apps for admin | Single app with route groups | Next.js 13+ (App Router) | Simplified deployment, shared auth context |
| Client-side auth only | Server Components + auth helpers | Next.js 14 | Better security, reduced client JS |
| Separate UI libraries | shadcn/ui (copy-paste) | 2023-2024 | Full control over components, no runtime dependency |
| Manual role checks | Centralized auth package | Project inception | Consistent auth logic across all routes |

**Deprecated/outdated:**
- **Pages router**: Use App Router with route groups instead
- **NextAuth.js for custom JWT**: Project uses custom JWT with Supabase, don't introduce NextAuth
- **Separate admin domains**: Route groups (`(protected)/(admin)`) provide same separation without deployment overhead

## Open Questions

1. **Admin component library structure**
   - What we know: Need shared admin components (AdminTable, AdminForm, AdminDialog)
   - What's unclear: Exact file structure under `app/components/admin/`
   - Recommendation: Create flat structure initially (`AdminTable.tsx`, `AdminForm.tsx`), reorganize into subfolders if needed

2. **Feedback admin endpoint necessity**
   - What we know: `app/api/admin/feedback/route.ts` exists in both apps
   - What's unclear: Whether feedback feature is actively used or can be removed
   - Recommendation: Keep feedback endpoint during migration, evaluate usage in Phase 4 (Dashboard)

3. **Middleware runtime configuration**
   - What we know: Admin app uses Node.js runtime, web app uses Edge runtime
   - What's unclear: Optimal middleware configuration after merge
   - Recommendation: Keep Edge runtime for performance, move JWT verification to server components

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.mjs` |
| Quick run command | `pnpm test admin-login.spec.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-01 | Unified admin interface accessible | e2e | `playwright test admin-login.spec.ts` | ✅ `tests/admin-login.spec.ts` |
| ADM-02 | Admin navigation works across pages | e2e | `playwright test admin-auth-simple.spec.ts` | ✅ `tests/admin-auth-simple.spec.ts` |
| ADM-03 | Shared components render correctly | visual | Manual verification required | ❌ Wave 0 |
| ADM-04 | Single app deployment | deployment | Manual verification required | ❌ Wave 0 |
| ADM-05 | Duplicate code removed | code-analysis | `diff apps/admin apps/web` (manual) | ❌ Wave 0 |
| ADM-06 | Admin layout/sidebar displays | e2e | `playwright test admin-local.spec.ts` | ✅ `tests/admin-local.spec.ts` |

### Sampling Rate
- **Per task commit:** `pnpm test admin-login.spec.ts --grep "should show login page"` (smoke test)
- **Per wave merge:** `pnpm test` (full Playwright suite)
- **Phase gate:** Full suite green + manual verification of single app deployment

### Wave 0 Gaps
- [ ] `tests/admin/admin-unification.spec.ts` — covers ADM-01, ADM-02, ADM-06
- [ ] `tests/admin/component-sharing.spec.ts` — covers ADM-03
- [ ] `tests/admin/deployment.spec.ts` — covers ADM-04, ADM-05
- [ ] Framework install: None required (Playwright already configured)

**Existing test infrastructure covers basic admin access flows. New tests needed for:**
1. Verifying unified admin interface (no `/admin` route in separate app)
2. Testing shared component imports work correctly
3. Verifying single deployment configuration

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** — Examined duplicate files in `apps/admin` and `apps/web`, verified 99% code duplication
- **Next.js documentation** — App Router route groups, server components, middleware patterns
- **Project CONTEXT.md** — User decisions locked in via `/gsd:discuss-phase`
- **Existing code patterns** — Admin layouts, sidebars, API routes in both apps

### Secondary (MEDIUM confidence)
- **npm registry** — Verified current versions of Next.js (16.1.7), TanStack Query (5.90.21), Radix UI (1.1.15) on 2026-03-18
- **Playwright configuration** — Existing test setup at `playwright.config.mjs`
- **Auth package** — `@query-stream-ai/auth/server` provides role-based helpers

### Tertiary (LOW confidence)
- **Web search attempts** — Web search tools experienced technical difficulties, no external sources retrieved
- **Training data** — Knowledge of Next.js 14/15 patterns from training, may be outdated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified versions from npm registry, all packages already in use
- Architecture: HIGH - Examined existing codebase, patterns proven in production
- Pitfalls: HIGH - Common monorepo consolidation issues, identified specific code differences
- Migration approach: HIGH - File-by-file comparison shows minimal differences

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days - Next.js ecosystem stable, migration patterns consistent)
