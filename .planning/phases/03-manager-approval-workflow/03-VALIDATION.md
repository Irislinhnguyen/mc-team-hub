---
phase: 03
slug: manager-approval-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `apps/web/playwright.config.ts` |
| **Quick run command** | `npm test -- tests/approvals.spec.ts -g "should submit for approval"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick smoke test for modified endpoints (`npm test -- tests/approvals.spec.ts -g "should submit"`)
- **After every plan wave:** Run full approval test suite (`npm test`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | APPR-01, APPR-02 | unit | `npm test -- tests/migrations.spec.ts -g "approval status"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | APPR-13 | unit | `npm test -- tests/approvals.spec.ts -g "audit trail"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | APPR-02 | e2e | `npm test -- tests/approvals.spec.ts -g "approvals table"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | APPR-04 | e2e | `npm test -- tests/approvals.spec.ts -g "should submit for review"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | APPR-07 | e2e | `npm test -- tests/approvals.spec.ts -g "should list pending"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | APPR-14 | e2e | `npm test -- tests/approvals.spec.ts -g "submit notification"` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | APPR-05, APPR-06 | e2e | `npm test -- tests/approvals.spec.ts -g "should approve"` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | APPR-14 | e2e | `npm test -- tests/approvals.spec.ts -g "approve notification"` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | APPR-08 | e2e | `npm test -- tests/approvals.spec.ts -g "should show submit button"` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 3 | APPR-08 | e2e | `npm test -- tests/approvals.spec.ts -g "should submit all"` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 3 | APPR-08 | e2e | `npm test -- tests/approvals.spec.ts -g "button disabled after submit"` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 4 | APPR-09, APPR-10 | e2e | `npm test -- tests/approvals.spec.ts -g "should load approval queue"` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 4 | APPR-11 | e2e | `npm test -- tests/approvals.spec.ts -g "should show detail view"` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 4 | APPR-10 | e2e | `npm test -- tests/approvals.spec.ts -g "should edit grades"` | ❌ W0 | ⬜ pending |
| 03-05-04 | 05 | 4 | APPR-10 | e2e | `npm test -- tests/approvals.spec.ts -g "should approve"` | ❌ W0 | ⬜ pending |
| 03-05-05 | 05 | 4 | APPR-11 | e2e | `npm test -- tests/approvals.spec.ts -g "next prev navigation"` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 5 | APPR-12 | e2e | `npm test -- tests/approvals.spec.ts -g "should block publish"` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 5 | APPR-13, APPR-14 | e2e | `npm test -- tests/approvals.spec.ts -g "publish notification"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/approvals.spec.ts` — Complete E2E test suite for approval workflow
- [ ] `tests/auth/setup-admin-approver.ts` — Auth setup for Manager/Leader roles
- [ ] Framework install: None — Playwright already configured

*Note: All tests marked "❌ W0" are Wave 0 gaps — tests will be written during execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email delivery | APPR-14 | SMTP configuration requires real email service | 1. Trigger notification 2. Check email inbox 3. Verify content |
| Notification timing | APPR-14 | Async notification delivery has variable latency | 1. Trigger approval 2. Measure time to notification 3. Should be <5s |
| Publish button disabled state | APPR-12 | UI state verification needs visual inspection | 1. Open grading page 2. Check publish button shows disabled 3. Status shows "Awaiting approval" |

*Note: These will be manually verified during UAT (User Acceptance Testing).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
