# IMPLEMENT_PLAN.md

## Overview
- **Start state**: The dashboard is already in production-ready maintenance mode with passing finance tests/build, stable local refresh and restore behavior, stateless Vercel refresh behavior, and decision-grade cash/scenario foundations. The active root-level plan now exists; the main remaining gaps are incomplete monthly reconciliation flow, settings scope that should be trimmed, and the need for stronger field discipline on critical Google Sheet inputs.
- **End state**: The project has an active root-level implementation plan, synchronized docs, a monthly drilldown/reconciliation path aligned with cash truth, lean settings limited to decision-grade behavior, stronger operator discipline on critical sheet fields, and a verified maintenance baseline where cash/scenario remain decision-grade and supporting surfaces remain operator-grade without distorting decisions.
- **Total milestones**: 5
- **Estimated total effort**: L

## Milestone 1 Completion Record
- Root `IMPLEMENT_PLAN.md` now exists and is the active planning surface.
- `README.md`, `OPERATOR_MANUAL.md`, and `GOOGLE_SHEET_CONTRACT.md` now point to the active plan instead of the archived backup plan.
- `PROJECT_BRAIN.md` and `IMPLEMENT_PLAN.md` are synced so the current milestone and next safe action point to the active roadmap.
- The backup plan remains archived in `Backup_IMPLEMENT_PLAN/25042026_IMPLEMENT_PLAN.md` for reference only.

---

## Milestone 1: Plan Activation And Doc Sync
**Goal**: Restore an active execution plan in repo root and remove document drift before new feature work continues.
**Dependencies**: none

| # | Task | Effort | Risk | Verification |
|:--|:-----|:------:|:----:|:-------------|
| 1.1 | Create root-level `IMPLEMENT_PLAN.md` from the current `PROJECT_BRAIN.md` state and refined user priorities | S | LOW | File exists at repo root and matches current project direction |
| 1.2 | Update `README.md`, `OPERATOR_MANUAL.md`, `GOOGLE_SHEET_CONTRACT.md`, and `PROJECT_BRAIN.md` references to point to the active plan instead of only the backup plan | S | HIGH | All referenced paths exist and no core doc points to a missing active plan |
| 1.3 | Add one short maintenance planning rule so future milestones are recorded in the active plan first, not in backup files | S | LOW | Manual doc review confirms one active planning source of truth |

**Milestone complete when**: The repo has a root-level `IMPLEMENT_PLAN.md`, core docs point to it correctly, and planning-location drift is removed.

---

## Milestone 2: Monthly Cash Reconciliation
**Goal**: Make monthly drilldown and reconciliation trace directly to the same monthly cash truth used by the top-level cash surface.
**Dependencies**: Milestone 1

| # | Task | Effort | Risk | Verification |
|:--|:-----|:------:|:----:|:-------------|
| 2.1 | Define one reconciliation contract for monthly cash: opening balance, inflow, outflow, net, and month-end balance using `Work Month` only | S | HIGH | Manual comparison between the contract and `buildMonthlyCashFlowRows` / current cash logic |
| 2.2 | Implement a monthly drilldown model/helper that groups ledger rows into the same month-level totals used by the cash chart | M | HIGH | Target month drilldown totals equal chart monthly totals on fixture data |
| 2.3 | Update ledger or supporting UI so operators can inspect the exact rows behind a month's cash movement without creating a competing truth layer | M | HIGH | Manual browser check shows month drilldown matches chart totals and does not alter cash overview logic |
| 2.4 | Add focused regression tests for reconciliation alignment, including cancelled rows, mixed statuses, and interleaved row order | M | HIGH | `npm.cmd run test:finance` covers new reconciliation paths and passes |

**Milestone complete when**: An operator can inspect any month from the cash surface and get the same monthly numbers in drilldown as in the top-level cash chart.

---

## Milestone 3: Lean Settings And Decision Surface Tightening
**Goal**: Reduce settings and secondary UI weight so the product stays a lean cash-survival dashboard.
**Dependencies**: Milestone 1

| # | Task | Effort | Risk | Verification |
|:--|:-----|:------:|:----:|:-------------|
| 3.1 | Audit current settings fields and classify each one as decision-grade, operator-support, or removable noise | S | LOW | Settings inventory exists and each field has an explicit keep/reduce/remove decision |
| 3.2 | Remove or hide settings that do not directly influence decision-grade cash/scenario behavior | M | LOW | Settings page shows only retained controls and build passes |
| 3.3 | Reduce the visual weight of secondary metrics or sections that distract from cash truth while keeping traceability intact | M | HIGH | Manual browser review confirms cash/scenario remain first-read surfaces |
| 3.4 | Update docs to state the lean settings rule clearly so future work does not re-expand configurability by accident | S | LOW | `PROJECT_BRAIN.md` and `OPERATOR_MANUAL.md` reflect the lean settings boundary |

**Milestone complete when**: Settings and supporting UI contain only essential controls for decision-grade behavior, and the first-read experience stays focused on cash survival.

---

## Milestone 4: Critical Sheet Discipline Hardening
**Goal**: Reduce ongoing normalization burden by tightening operator discipline on the Google Sheet fields that matter most.
**Dependencies**: Milestone 1

| # | Task | Effort | Risk | Verification |
|:--|:-----|:------:|:----:|:-------------|
| 4.1 | Identify the minimum critical fields to enforce more strongly: `Work Month`, `Status`, `Main Category`, `Amount`, `Cost Behavior`, `Sponsor`, `Person`, and `Original Forecast` handling | S | HIGH | Critical field list matches `PROJECT_BRAIN.md` and `GOOGLE_SHEET_CONTRACT.md` |
| 4.2 | Tighten validation and operator guidance for these fields without changing sheet meaning or requiring a schema redesign | M | HIGH | Validation messages remain actionable and docs explain how to fill fields consistently |
| 4.3 | Where safe, simplify parser fallbacks so important missing fields surface as cleanup work instead of being silently inferred | M | HIGH | Regression tests pass and warnings become more explicit without breaking current data loading |
| 4.4 | Re-test support-sheet behavior so production summary and sponsor pipeline stay operator-grade and never block cash truth | S | HIGH | `npm.cmd run test:finance` passes and support-sheet warnings remain scoped correctly |

**Milestone complete when**: Critical fields are more explicitly enforced, operator guidance matches that enforcement, and the dashboard depends less on silent inference for important cash logic.

---

## Milestone 5: Release Gate And Maintenance Baseline
**Goal**: Close the roadmap with a repeatable maintenance baseline for future feature batches.
**Dependencies**: Milestones 2, 3, and 4

| # | Task | Effort | Risk | Verification |
|:--|:-----|:------:|:----:|:-------------|
| 5.1 | Run a full verification pass after the earlier milestones: tests, build, diff check, and manual review of cash truth, scenario, reconciliation, settings, and validation surfaces | S | HIGH | `npm.cmd run test:finance`, `npm.cmd run build`, `git diff --check`, and manual review all pass |
| 5.2 | Update `PROJECT_BRAIN.md` current state, known risks, and next safe action to reflect the new stable baseline | S | LOW | Brain reflects actual repo state after milestone completion |
| 5.3 | Update `OPERATOR_MANUAL.md` with the final monthly reconciliation flow and any changed validation/operator steps | S | LOW | Operator manual matches the shipped behavior |
| 5.4 | Record the next gated decision points for future work so new feature requests do not bypass the orchestrator-worker and verification model | S | LOW | Active plan and brain both show the next gated decision points |

**Milestone complete when**: The repo has a stable post-change maintenance baseline with aligned docs, passing verification, and a clear handoff point for the next feature batch.

---

## Execution Notes
- **Blocked items**:
  - Any task that changes Google Sheet schema or business meaning is `[BLOCKED: owner approval required]`.
  - Any future scope expansion into accounting, CRM, payroll, auth, or database persistence is `[BLOCKED: out of scope unless owner changes product direction]`.
- **Decision points**:
  - After Milestone 2, decide whether the reconciliation UI is sufficient or needs a second pass before any new metrics/features.
  - After Milestone 3, decide whether any remaining settings should stay exposed or move fully into static defaults.
  - After Milestone 4, decide whether current Google Sheet discipline is sufficient or whether stronger operator enforcement is needed outside the dashboard.
- **Risk checkpoints**:
  - After Milestone 2: run full verification because this touches the known risk of wrong month-end cash truth.
  - After Milestone 4: run full verification because this touches validation, inference, and support-sheet reliability risks.
  - After Milestone 5: treat the resulting repo state as the new maintenance baseline only if all verification commands pass.
