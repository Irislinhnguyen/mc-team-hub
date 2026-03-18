# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Duplicate Code Across Apps:**
- Issue: Identical service files duplicated between `apps/web` and `apps/admin`
- Files:
  - `apps/web/lib/services/analyticsQueries.ts` (2,326 lines)
  - `apps/admin/lib/services/analyticsQueries.ts` (2,166 lines)
  - `lib/services/analyticsQueries.ts` (2,232 lines)
  - Similar duplication for `aiSqlGenerator.ts`, `focusService.ts`, `sheetToDatabaseSync.ts`, etc.
- Impact: Maintenance burden, inconsistent behavior, code bloat
- Fix approach: Create shared packages structure with proper workspace configuration

**Missing Shared Package Structure:**
- Issue: Monorepo structure exists but lacks proper package separation
- Files: `package.json` only contains dev dependencies
- Impact: Dependencies duplicated, version inconsistencies, poor build optimization
- Fix approach: Split into proper packages (shared, components, services) with export management

**Large Service Files:**
- Issue: Service files exceeding 2,000 lines are difficult to maintain
- Files:
  - `apps/web/lib/services/analyticsQueries.ts` (2,326 lines)
  - `apps/admin/lib/services/analyticsQueries.ts` (2,166 lines)
  - `lib/services/aiSqlGenerator.ts` (2,012 lines)
- Impact: Hard to navigate, testing challenges, single responsibility violations
- Fix approach: Break into smaller, focused services (query builders, formatters, validators)

## Known Bugs

**Filter Persistence Bugs:**
- Symptoms: Filters persisting incorrectly after navigation
- Files: `tests/cross-filter-business-health.spec.ts:70`, `tests/cross-filter-backend-integration.spec.ts:152`
- Trigger: Navigation between filter components
- Workaround: Manual page refresh

**Debug Logging in Production:**
- Issue: Debug console logs scattered throughout production code
- Files: Multiple files in `gcppQueries.ts`, `deep-dive/route.ts`, etc.
- Symptoms: Performance impact, information leakage
- Fix approach: Create proper logging framework with environment-based levels

**CrossFilter Type Definition:**
- Issue: `type CrossFilter = any` prevents type safety
- Files: `apps/web/lib/hooks/useFilterPresets.ts:19`, `apps/web/components/performance-tracker/FilterPresetManager.tsx:42`
- Impact: Runtime errors possible, poor IDE support
- Fix approach: Define proper TypeScript interface for CrossFilter

## Security Considerations

**Authentication Security Warning:**
- Risk: Weak JWT secret warning displayed in multiple files
- Files: Multiple `lib/services/auth.ts` files show warning for weak JWT_SECRET_KEY
- Current mitigation: Warning logged but no enforcement
- Recommendations: Enforce strong secret validation, use environment validation

**Hardcoded Email Addresses:**
- Risk: Placeholder email addresses in production code
- Files: `app/(protected)/performance-tracker/team-setup/page.tsx`, `app/(protected)/pipelines/team-setup/page.tsx`
- Problem: `'current.user@geniee.co.jp'` hardcoded instead of getting from auth
- Recommendations: Extract from actual authentication context

**Admin Client Usage:**
- Risk: Multiple API routes using admin client to bypass RLS
- Files: Multiple pipeline endpoints use "admin client to bypass RLS"
- Current mitigation: Comments indicate RLS policies should protect
- Recommendations: Audit all bypass usages, ensure proper authorization checks

**Test Data in Production Code:**
- Risk: Test credentials hardcoded in multiple files
- Files: Multiple test files with `ADMIN_EMAIL = 'admin@geniee.co.jp'`
- Recommendations: Move to environment variables or separate test config

## Performance Bottlenecks

**Large Query Files:**
- Problem: Analytics queries exceeding 2,000 lines
- Files: `analyticsQueries.ts` files in both apps and lib
- Cause: Complex SQL generation logic mixed with data transformation
- Improvement path: Separate SQL generation from data processing, implement query caching

**Missing Index Optimization:**
- Problem: No evidence of database index optimization
- Files: Various query files perform full table scans
- Cause: No index hints or query optimization strategies
- Improvement path: Add EXPLAIN ANALYZE logging, implement query performance monitoring

## Fragile Areas

**Sheet Sync Service:**
- Files: `sheetToDatabaseSync.ts` files in multiple locations
- Why fragile: Heavy reliance on exact column names, complex data transformation
- Safe modification: Extract column mapping to configuration, add validation steps
- Test coverage: Limited automated testing for edge cases

**AI SQL Generator:**
- Files: `aiSqlGenerator.ts` files in multiple locations
- Why fragile: Complex string manipulation, multiple SQL dialects
- Safe modification: Implement SQL parsing and validation, add sandboxing
- Test coverage: Limited integration tests for complex queries

**Manual PIC Mapping:**
- Files: `sheetToDatabaseSync.ts`, `teamMatcher.ts`
- Why fragile: Manual string matching for PIC codes
- Safe modification: Implement proper referential integrity, add fuzzy matching
- Test coverage: Missing tests for edge cases

## Scaling Limits

**File Size Limits:**
- Current capacity: Individual service files up to 2,300 lines
- Limit: Bundle size limits, build performance issues
- Scaling path: Service decomposition, lazy loading, code splitting

**Memory Usage:**
- Current capacity: Large in-memory data structures
- Limit: Browser memory limits for web app
- Scaling path: Implement pagination, virtual scrolling, data streaming

## Dependencies at Risk

**Supabase Version:**
- Risk: Multiple Supabase clients without version pinning
- Impact: Breaking changes in RLS, auth, or data APIs
- Migration plan: Pin to stable version, implement client abstraction

**Next.js Version:**
- Risk: Using edge features without version stability
- Impact: Breaking changes in API routes, middleware
- Migration plan: Pin to LTS version, test upgrades incrementally

## Missing Critical Features

**Filter Sharing:**
- Problem: Filter presets not shared between users
- Files: `app/api/filter-presets/route.ts:91` has TODO comment
- Blocks: Collaboration features, team-based workflows

**AI Insights Integration:**
- Problem: AI insights routes removed temporarily
- Files: `app/(protected)/performance-tracker/deep-dive-old-archive/page.tsx`
- Blocks: Advanced analytics features

## Test Coverage Gaps

**Service Layer Testing:**
- What's not tested: Core business logic in service files
- Files: Most `services/` files lack unit tests
- Risk: Runtime errors during refactoring, data corruption
- Priority: High (critical business logic)

**API Integration Testing:**
- What's not tested: API endpoints with complex business logic
- Files: Many API routes lack integration tests
- Risk: Silent failures, incorrect data transformation
- Priority: Medium

---

*Concerns audit: 2026-03-18*