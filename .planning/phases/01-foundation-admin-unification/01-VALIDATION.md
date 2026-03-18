---
phase: 1
slug: foundation-admin-unification
status: ready
nyquist_compliant: true
wave_0_complete: true
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

- **After every task commit:** Run grep verification commands from plan (instant feedback)
- **After every plan wave:** Run `pnpm test` (full Playwright suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (grep commands)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | ADM-03 | grep | `grep "from '@/components/ui/table'"` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | ADM-03 | grep | `grep "from '@/components/ui/form'"` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | ADM-03 | grep | `grep "from '@/components/ui/dialog'"` | ✅ | ⬜ pending |
| 01-01-04 | 01 | 1 | ADM-03 | grep | `grep "export { AdminTable }" index.ts` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | ADM-06, ADM-02 | grep | `grep "from '@/components/ui/badge'"` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | ADM-06, ADM-01 | grep | `grep "isLeaderOrAbove"` | ✅ | ⬜ pending |
| 01-02-03 | 02 | 2 | ADM-06 | grep | `grep "Admin Dashboard" overview/page.tsx` | ✅ | ⬜ pending |
| 01-02-04 | 02 | 2 | ADM-01, ADM-02 | visual | Manual checkpoint: verify sidebar | ❌ | ⬜ pending |
| 01-03-01 | 03 | 3 | ADM-04 | grep | `! grep -r "apps/admin" package.json` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 3 | ADM-04 | bash | `! test -d apps/admin` | ✅ | ⬜ pending |
| 01-03-03 | 03 | 3 | ADM-05 | grep | `! grep -r "@query-stream-ai/ui" apps/web/` | ✅ | ⬜ pending |
| 01-03-04 | 03 | 3 | ADM-04 | build | `pnpm turbo run build --filter=web` | ✅ | ⬜ pending |
| 01-03-05 | 03 | 3 | ADM-04, ADM-05 | visual | Manual checkpoint: verify consolidation | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] All tasks have `<automated>` verify commands (grep, bash, build)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 30s (grep commands are instant)
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Checkpoint tasks for visual verification after automation completes

*Framework install: None required (Playwright already configured)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar navigation | ADM-01, ADM-02 | Visual verification | Visit /admin/overview, verify all 7 nav items show and highlight correctly |
| Admin consolidation | ADM-04, ADM-05 | Deployment verification | After build, verify apps/admin deleted, all /admin routes work |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 complete (all verification commands exist)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (grep/bash commands)
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Checkpoint tasks for human verification after automated tasks complete

**Approval:** ready

---

*Phase: 01-foundation-admin-unification*
*Validation strategy: 2026-03-18*
