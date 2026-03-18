# Phase 03: Manager Approval Workflow - Plan Index

**Total Plans:** 8 plans in 7 waves

## Wave Structure

| Wave | Plans | Description | Dependencies |
|------|-------|-------------|--------------|
| 0 | 03-00 | Test Infrastructure (E2E tests + auth fixtures) | None |
| 1 | 03-01 | Database + Types (new statuses + approvals table) | None |
| 2 | 03-02, 03-03 | Leader submit API + Manager approve/edit APIs | 03-01 |
| 3 | 03-04 | Leader submit UI (SubmitForReviewButton) | 03-02 |
| 4 | 03-05a | Approval queue components (ApprovalQueueTable + ApproveButton) | 03-02 |
| 5 | 03-05b | Approval queue page + detail view + AdminSidebar | 03-02, 03-03, 03-05a |
| 6 | 03-06 | Publish API (Manager approval enforcement) | 03-03 |

## Plans

- [ ] 03-00-PLAN.md — Test Infrastructure (Wave 0)
  - Generate E2E tests and auth fixtures for approval workflow
  - Tests: approvals.spec.ts with 8+ test cases
  - Fixtures: auth.setup-admin-approver.ts for Manager/Leader roles
  - Status: Not started

- [ ] 03-01-PLAN.md — Database + Types (Wave 1)
  - APPR-01, APPR-02, APPR-13: Extend submission status enum with pending_review and approved, create approvals audit table
  - 3 tasks: Create migration with new statuses and approvals table, regenerate TypeScript types, apply migration to Supabase (human checkpoint)
  - Status: Not started

- [ ] 03-02-PLAN.md — Leader Submit API + Pending List API (Wave 2)
  - APPR-04, APPR-07, APPR-14: POST endpoint for Leader to submit grades, GET endpoint for Manager to list pending approvals, GET endpoint for approval history
  - 3 tasks: Create submit-for-review API, create pending approvals list API, create approval history API
  - Status: Not started

- [ ] 03-03-PLAN.md — Manager Approve + Edit Grades APIs (Wave 2)
  - APPR-05, APPR-06, APPR-14: POST endpoint for Manager to approve submission, PATCH endpoint for Manager to edit grades
  - 2 tasks: Create approve API endpoint, create edit grades API endpoint
  - Status: Not started

- [ ] 03-04-PLAN.md — Leader Submit UI (Wave 3)
  - APPR-08: SubmitForReviewButton component, bulk submit in grading interface
  - 3 tasks: Create SubmitForReviewButton component, create barrel export, integrate submit buttons into grading interface
  - Status: Not started

- [ ] 03-05a-PLAN.md — Approval Queue Components (Wave 4)
  - APPR-09, APPR-10: ApprovalQueueTable and ApproveButton components
  - 3 tasks: Create ApprovalQueueTable component, create ApproveButton component, update barrel export
  - Status: Not started

- [ ] 03-05b-PLAN.md — Approval Queue Page + Detail View (Wave 5)
  - APPR-11: ApprovalDetailView, approvals page, AdminSidebar navigation
  - 5 tasks: Create ApprovalDetailView component, update barrel export, create approvals queue page, add Approvals link to AdminSidebar, human verification checkpoint
  - Status: Not started

- [ ] 03-06-PLAN.md — Publish API Approval Enforcement (Wave 6)
  - APPR-12, APPR-13, APPR-14: Modify publish API to enforce Manager approval before publishing
  - 2 tasks: Add approval validation to publish API, human verification checkpoint
  - Status: Not started

## Requirements Coverage

| Requirement | Plans | Status |
|-------------|-------|--------|
| APPR-01 | 03-01 | Pending |
| APPR-02 | 03-01, 03-02 | Pending |
| APPR-03 | N/A | Out of scope (no rejection workflow) |
| APPR-04 | 03-02 | Pending |
| APPR-05 | 03-03 | Pending |
| APPR-06 | 03-03 | Pending |
| APPR-07 | 03-02 | Pending |
| APPR-08 | 03-04 | Pending |
| APPR-09 | 03-05a | Pending |
| APPR-10 | 03-05a | Pending |
| APPR-11 | 03-05b | Pending |
| APPR-12 | 03-06 | Pending |
| APPR-13 | 03-01, 03-06 | Pending |
| APPR-14 | 03-02, 03-03, 03-06 | Pending |

## Dependency Graph

```
03-00 (Wave 0) ──────────────────────────────────────┐
                                                    │
03-01 (Wave 1) ─────────────────────────────────────┤
                                                    │
         ┌──────────────────┐                       │
         │                  │                       │
    03-02 (Wave 2)      03-03 (Wave 2)               │
         │                  │                       │
         │                  ├──► 03-06 (Wave 6)     │
         │                  │                       │
         ├──► 03-04 (Wave 3)│                       │
         │                  │                       │
         ├──► 03-05a (Wave 4)                       │
         │                  │                       │
         │              03-05b (Wave 5) ────────────┤
         │                                        │
         └────────────────────────────────────────┴── Test infrastructure
```

## Execution Notes

- Wave 0 creates test infrastructure before any implementation
- Wave 1 creates database schema foundation
- Wave 2 creates API endpoints in parallel
- Wave 3 creates Leader UI for submit
- Wave 4 creates Manager UI components
- Wave 5 creates Manager page integrating components
- Wave 6 enforces approval requirement on publish

**Parallel execution opportunities:**
- Wave 2: 03-02 and 03-03 can run in parallel (both depend only on 03-01)
- Wave 3 and Wave 4: 03-04 and 03-05a can run in parallel (both depend only on 03-02)
