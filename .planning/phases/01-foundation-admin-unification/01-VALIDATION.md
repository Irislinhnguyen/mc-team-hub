---
phase: 1
slug: foundation-admin-unification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.mjs` |
| **Quick run command** | `pnpm test admin-login.spec.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test admin-login.spec.ts --grep "should show login page"` (smoke test)
- **After every plan wave:** Run `pnpm test` (full Playwright suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | ADM-01 | e2e | `pnpm test admin-login.spec.ts` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | ADM-02 | e2e | `pnpm test admin-auth-simple.spec.ts` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | ADM-03 | visual | Manual verification | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | ADM-04 | deployment | Manual verification | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | ADM-05 | code-analysis | Manual: `diff apps/admin apps/web` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | ADM-06 | e2e | `pnpm test admin-local.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/admin/admin-unification.spec.ts` — covers ADM-01, ADM-02, ADM-06 (unified admin interface, navigation, layout)
- [ ] `tests/admin/component-sharing.spec.ts` — covers ADM-03 (shared components render correctly)
- [ ] `tests/admin/deployment.spec.ts` — covers ADM-04, ADM-05 (single deployment, duplicate removal)

*Framework install: None required (Playwright already configured)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Single app deployment | ADM-04 | Deployment verification | After merge, verify only one Vercel project exists and all `/admin` routes work |
| Duplicate code removal | ADM-05 | Code analysis verification | Run `diff` or `git diff` to confirm `apps/admin` directory is deleted |
| Shared component rendering | ADM-03 | Visual verification | Import and render each shared admin component, verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase: 01-foundation-admin-unification*
*Validation strategy: 2026-03-18*
