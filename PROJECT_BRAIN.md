# PROJECT_BRAIN.md

Central operating memory for `Finance_Dashboard`.

Use this file before changing code, data schema, Google Sheet structure, scenario logic, refresh behavior, deployment behavior, or management KPI formulas.

## Project Definition

- Purpose: provide a lean internal finance management dashboard for Easymoneyconcept / Fin Friend Media.
- Primary users: founder/operator first. Future maintainers and AI agents are secondary users, not the product target.
- Problem: finance data lives in Google Sheets and can be hard to interpret quickly for weekly/monthly cash, revenue, cost, scenario, and decision risk.
- Desired outcome: a dashboard that helps the operator make weekly and monthly management decisions from a clear business overview, with Cash Flow & Running Balance as the main truth.
- In scope:
  - Google Sheet-backed transaction dashboard.
  - Cash overview, Cash Flow & Running Balance chart, Revenue & Sponsor view, Cash P&L view, Scenario Planner, Ledger.
  - Refresh from Google Sheets into local JSON snapshots.
  - Validation warnings classified by severity for data that is renderable but risky for management decisions.
  - Scenario planning for Base, Bull, and Bear cash paths with short plain-language logic.
  - Support sheets for production summary and sponsor pipeline only where they support cash/business decisions.
- Out of scope:
  - Double-entry accounting system.
  - Full accounting system behavior.
  - Tax filing automation.
  - Formal audited financial statements.
  - Payroll or bonus calculation system.
  - CRM or sponsor management system.
  - Multi-user permission/admin system.
  - Permanent database replacement while Google Sheets remains the source of truth.

## Success Criteria

The project is considered usable when:

- The dashboard loads from `data/current.json` through `GET /api/data`.
- `POST /api/refresh` can fetch Google Sheets and return a full refreshed snapshot.
- Cash, revenue, P&L, scenario, and ledger pages render without blocking errors.
- Every management metric can be traced back to transaction rows or support sheet rows.
- Validation issues are grouped as Critical, Management, and Info with clear operator action.
- Cash Flow & Running Balance uses a coherent monthly basis and does not depend on raw row order.
- Scenario Planner explains Base, Bull, and Bear assumptions clearly enough for non-technical operation.
- The first screen supports weekly/monthly business decisions without requiring the user to inspect raw transactions first.
- Secondary metrics do not distract from cash and scenario decision-making when their input data is incomplete.

The project is considered production-ready when:

- `npm.cmd run test:finance` passes.
- `npm.cmd run build` passes.
- Vercel deployment succeeds from `main`.
- Refresh behavior works in Vercel without attempting non-durable filesystem writes.
- Google Sheet source tabs have stable headers and no management warnings for currently used metrics.
- Latest pushed snapshot reflects the intended Google Sheet state.
- Known recovery playbooks below are enough to handle common refresh, data, and chart failures.

Quality success means:

- Business formulas are simple, auditable, and documented.
- The UI favors operational clarity over decorative complexity.
- Chart labels and scenario logic use wording the operator can act on.
- Code changes stay local to the relevant module unless a shared invariant requires broader edits.
- Lean product scope is preserved: avoid adding accounting, CRM, payroll, or permission-system behavior into this dashboard.

Reliability success means:

- Cancelled rows never affect calculations.
- Amount sign comes from `Type`, not negative amount values.
- Refresh failures do not corrupt the last known usable snapshot.
- Local backup/snapshot writes are not assumed to work on Vercel.

## Architecture Overview

- System shape: Next.js App Router dashboard with API routes, local JSON snapshots, Google Sheet refresh, and Chart.js visualizations.
- System flow:
  1. Human updates Google Sheet.
  2. `POST /api/refresh` fetches public CSV/gviz CSV from Google Sheets.
  3. Refresh parser validates and normalizes transaction/support data.
  4. Local environment writes `data/current.json`, support JSON files, and backups.
  5. Vercel/serverless environment returns the refreshed snapshot directly without relying on durable filesystem writes.
  6. `GET /api/data` loads dashboard snapshot and support data.
  7. `DashboardClient` stores data in React state and provides `DashboardContext`.
  8. Page sections and charts compute management views from context data.
- Core components:
  - `app/page.tsx`: dashboard entry.
  - `components/DashboardClient.tsx`: data loading, refresh, page navigation, context provider.
  - `components/sections/CashOverviewSection.tsx`: cash page.
  - `components/charts/CashFlowChart.tsx`: monthly inflow, outflow, and running balance.
  - `components/sections/RevenueSponsorSection.tsx`: revenue and sponsor view.
  - `components/sections/PnLCostSection.tsx`: cash P&L and cost metrics.
  - `components/sections/ScenarioPlannerSection.tsx`: Base/Bull/Bear cash scenarios.
  - `components/TransactionTable.tsx`: ledger audit view.
- Core libraries:
  - `lib/transactionModel.ts`: CSV parsing, source validation, refresh model, running balance recomputation.
  - `lib/dashboardMetrics.ts`: normalized transaction model and KPI formulas.
  - `lib/dataUtils.ts`: formatting, filters, helper utilities.
  - `lib/settingsDefaults.ts`: default Google Sheet config and dashboard settings.
  - `lib/settings.ts`: server-side settings load/save/normalization.
  - `lib/chartDefaults.ts`: Chart.js registration and shared styling.
- External dependencies:
  - Google Sheets public CSV/gviz CSV endpoints.
  - Vercel deployment from GitHub `main`.
  - Chart.js and `chartjs-plugin-annotation`.
- Persistence/state:
  - Source of truth: Google Sheet.
  - Local snapshot: `data/current.json`.
  - Support snapshots: `data/production-summary.json`, `data/sponsor-pipeline.json`.
  - Backups: `data/backups/*.json` on local filesystem only.
  - Runtime state: React state in `DashboardClient`.
- Integration points:
  - `GET /api/data`
  - `POST /api/refresh`
  - `GET/POST /api/settings`
  - `GET /api/backups`
  - `POST /api/restore`

## Design Principles

- Correctness over speed for management metrics.
- Traceability over cleverness: every number should be explainable from ledger/support rows.
- Google Sheet remains source of truth until a durable production store is explicitly introduced.
- Explicit sheet fields beat Thai keyword inference. Inference is only fallback and should trigger management warnings when important fields are missing.
- UI copy should be operational and plain. Avoid long scenario explanations in the UI.
- Cash decision first: Cash Flow & Running Balance is the main page truth; Scenario Planner is the main decision companion.
- Keep Health Cards as supporting warnings/checks, not the primary management surface.
- Hide or reduce metrics whose source data is not mature enough for reliable decisions.
- Keep charts aligned with their business question:
  - Cash Flow chart is operating cash overview and ignores ledger sidebar filters.
  - Ledger filter is for ledger inspection, not for changing top-level management cash truth.
- Do not hide data-quality risk. Warnings are better than silent inference for management use.
- Use severity groups for validation: Critical, Management, and Info.
- Preserve backward compatibility for existing sheet headers where practical.
- Avoid destructive operations on snapshots/backups unless the user explicitly requests them.
- Do not commit build artifacts, local logs, `.next`, `node_modules`, or transient dev-server files.
- For non-trivial project work, the primary agent acts as project brain and delegates implementation to worker agents when the user explicitly permits subagents.

## Lean Product Direction

Latest user calibration: 2026-04-23.

Confirmed direction:

- Product shape: business overview dashboard, not a narrow cash-only tool and not a full accounting system.
- Main user: founder/operator.
- Source of truth: Google Sheet.
- First-priority surface: Cash Flow & Running Balance.
- Scenario depth: Base/Bull/Bear running balance plus a short logic table in plain language.
- Forecast Accuracy: remove or hide for now because `Original Forecast` data is not mature enough.
- Production Metrics: medium importance. Use `Cost per Content` only for months with actual content count and usable Monthly Production Summary data.
- Health Cards: keep as secondary warnings/checks.
- Validation: classify warnings as Critical, Management, and Info.
- Google Sheet schema: keep flexible but require clear fields for important cash logic.
- Language/data model: normalize internally to stable English keys while supporting Thai display and mixed Thai/English sheet values.
- Release target: usable for weekly and monthly management decision meetings.
- First metric to reduce: Forecast Accuracy.
- Operating model: dashboard has manual refresh and keeps the latest snapshot.
- Cashflow debugging: add or preserve monthly transaction drilldown as the preferred first diagnostic level.
- Out of scope now: accounting system, CRM/sponsor management system, payroll/bonus system, multi-user permission/admin system.
- Documentation structure: user prefers a split-document model, but the user will handle that organization separately.
- Next improvement themes: lean cleanup, data reliability, UX clarity, and Google Sheet workflow.

Confirmed secondary metrics:

- Production Metrics are useful as a secondary signal, but they must not block core cash/scenario decisions. `Cost per Content` should only show for months with actual content count; forecast-only production months should not be treated as complete production performance.

## Current Verified State

- Last verified: 2026-04-25, by local test/build run after Milestone 7 batch-1 ops changes.
- Current branch: `main`.
- Latest known pushed commit before this update: `1eab99f Close milestone two refresh reliability work`.
- Git state before this update: `main...origin/main`.
- Current milestone: Milestone 7 - Deployment, Operations, and Release Readiness.
- Completed:
  - Milestone 1 - Scope Lock and Baseline Freeze completed.
  - Milestone 2 - Google Sheet Contract and Refresh Reliability completed.
  - Milestone 3 - Cash Flow and Scenario Correctness completed.
  - Milestone 4 - Validation Rules and Data Quality Gating completed.
  - Added `IMPLEMENT_PLAN.md` with the milestone path to lean production readiness.
  - Recorded M1 completion artifacts: scope checklist, metric meaning map, excluded features, and owner-only decisions.
  - Replaced old scenario planner with current-situation Base/Bull/Bear cash cases.
  - Added scenario running balance chart with Actual History plus Base/Bull/Bear.
  - Bear case shifts all future non-ad customer revenue inflows by one month; ad revenue stays on schedule.
  - Scenario includes non-Actual rows from the latest actual Work Month onward.
  - Fixed Vercel refresh behavior so serverless refresh does not require writing `data/backups`.
  - Fixed Cash Flow & Running Balance so balance is recomputed by sorted Work Month from opening balance, not by last raw row per month.
  - Refreshed `data/current.json` from Google Sheet after TikTok date correction and later sheet date changes.
  - Added focused regression tests for Cash Flow monthly balance and Scenario current-month non-Actual rows.
  - Added `OPERATOR_MANUAL.md` for day-to-day sheet/dashboard operation.
  - Added `GOOGLE_SHEET_CONTRACT.md` for active sheet tabs, field aliases, validation behavior, and refresh persistence rules.
  - Added optional support-sheet fallback guardrail so unusable support sheet refreshes do not overwrite usable local support snapshots.
  - Added a management warning for nonblank invalid `Original Forecast` values so bad forecast-history inputs do not stay silent.
  - Isolated refresh persistence in `lib/refreshPersistence.ts` so local filesystem mode and Vercel/stateless mode are testable outside the route.
  - Local refresh writes current/support snapshots through temporary files before swapping them into place, which reduces the risk of leaving unreadable partial JSON after a failed write.
  - Added focused regression tests for local snapshot backup creation, stateless no-write behavior on Vercel, and the core-field validation group split.
  - Converted validation reporting to Critical/Management/Info buckets with operator-action grouping and legacy snapshot normalization.
  - Validation summary UI now reflects the new grouping and keeps legacy snapshots readable.
  - Milestone 5 - Decision-First UI and UX Cleanup completed.
  - Milestone 6 - Testing and Regression Coverage completed.
  - First screen now puts cash truth ahead of validation noise and includes a compact scenario preview on the cash page.
  - Cash page summary now compresses current cash, runway, pressure, and active warning signals into a faster management read.
  - Scenario page copy was tightened, mojibake was removed from user-facing text, and the Scenario Logic section was restored in simple Thai.
  - Revenue and Cash P&L pages now use clearer operational wording and de-emphasize immature metrics such as Forecast Accuracy.
  - Header and page chrome now use neutral operator-facing wording instead of hard-coded period copy.
  - Added focused regression tests for Bear-case revenue delay behavior so non-ad customer inflows shift by one month while ad revenue stays on schedule.
  - Added focused regression tests for scenario projection horizon so the delayed month remains visible even when it has no same-month Base activity.
  - Added Monthly Production Summary cross-check warnings for actual COGS total and cost-per-content mismatches.
  - Moved Bull scenario assumptions into normalized scenario settings.
  - Current cash and Scenario actual history now derive from monthly cash balances instead of the last raw actual-row balance.
  - Revenue and direct/indirect management charts now use the full snapshot rather than ledger filter state.
  - Monthly cash rows now ignore months that only contain cancelled transactions.
  - Removed obvious mojibake from source/docs surfaces under `app`, `components`, `lib`, and `tests`.
- In progress:
  - Milestone 7 - Deployment, Operations, and Release Readiness.
  - M7 batch 1 aligned `GET /api/backups` and `POST /api/restore` with the stateless Vercel model: backups stay local-only and restore is unavailable in serverless mode.
  - M7 batch 2 verified the local flow: `GET /api/backups`, `POST /api/refresh`, and `POST /api/restore` all work in local filesystem mode, but restored backups still need validation review before being trusted for management use.
- Pending:
  - Keep monthly transaction drilldown aligned with the top-level cash truth.
  - Validate the live Vercel deployment after GitHub/Vercel finishes redeploying latest commits as part of deployment/release work, not sheet-contract work.
  - Continue monitoring scenario and cash chart behavior as more future transaction rows are added.
- Latest validation known from recent work:
  - `npm.cmd run test:finance` passed 21 tests after Milestone 7 batch-1 ops changes.
  - `npm.cmd run build` passed after Milestone 7 batch-1 ops changes.
  - `git diff --check` passed with only LF/CRLF warnings.
  - Regression coverage now protects support-sheet fallback, refresh persistence, validation grouping, monthly cash derivation, scenario anchoring, Bear delay logic, delayed-month horizon behavior, Bull default normalization, and stateless backup/restore gating.
  - Current regression coverage protects refresh persistence, support-sheet fallback, validation grouping, monthly cash derivation, scenario anchoring, and Bull default normalization.
  - Local verification confirmed `GET /api/backups`, `POST /api/refresh`, and `POST /api/restore` succeed in local filesystem mode. Restoring the older backup `2026-04-24T18-06-59.json` returned a valid snapshot file but surfaced 8 management issues, so restored backups still require validation review before management use.

## Next Safe Action

- Action: execute Milestone 7 by tightening deployment/release verification and live operating checks without changing business logic.
- Preconditions:
  - Read `PROJECT_BRAIN.md`, `IMPLEMENT_PLAN.md`, and `AGENTS.md` in order.
  - Keep the Google Sheet contract, monthly cash logic, validation grouping, M5 decision-first surface, and M6 regression scope unchanged unless a real bug requires a change.
- Stop if:
  - A proposed change changes Google Sheet schema without explicit user approval.
  - A proposed deployment or ops change assumes durable serverless filesystem writes or changes cash/scenario meaning.
- Verify with:
  - `npm.cmd run test:finance`.
  - `npm.cmd run build`.
  - Local and live verification that refresh/release behavior matches the intended operating model.

## Improvement Triage

Scoring model:

- Difficulty: hard = `0`, medium = `1`, easy = `2`.
- Importance: low = `0`, medium = `1`, high = `2`.
- Fix now if total score is `>= 3`.
- If total score is `< 3`, do not fix now; keep it documented for later.

| ID | Issue | Difficulty | Importance | Total | Decision |
|---|---|---:|---:|---:|---|
| IP01 | Source of truth is split between Google Sheet and git snapshot | 0 | 2 | 2 | Later |
| IP02 | Vercel refresh is stateless and not durable | 0 | 2 | 2 | Later |
| IP03 | Cash Flow and Scenario duplicate monthly cash/running-balance logic | 1 | 2 | 3 | Fix now |
| IP04 | Regression tests missing for Cash Flow/Scenario bugs | 2 | 2 | 4 | Fix now |
| IP05 | Work Month vs Date can confuse operators | 2 | 2 | 4 | Fix now |
| IP06 | Data model naming still blurs cash timing vs work period | 1 | 2 | 3 | Fix now |
| IP07 | Row-level `balance` can be misused outside ledger/current-cash context | 2 | 2 | 4 | Fix now |
| IP08 | Scenario running balance can hide monthly delay pain | 1 | 2 | 3 | Fix now |
| IP09 | Bull case assumptions are hard-coded in component code | 2 | 1 | 3 | Fix now |
| IP10 | Validation lacks some business-rule warnings | 1 | 2 | 3 | Fix now, narrow scope only |
| IP11 | Google Sheet schema relies on manual discipline | 1 | 2 | 3 | Fix now, documentation/validation only |
| IP12 | Production Summary cross-checking could be stronger | 1 | 1 | 2 | Fixed by user override |
| IP13 | Vercel/live verification is manual | 2 | 1 | 3 | Fix now via checklist |
| IP14 | No operator manual | 2 | 2 | 4 | Fix now |
| IP15 | Release process is implicit | 2 | 1 | 3 | Fix now via checklist |
| IP16 | Thai encoding/mojibake debt remains | 1 | 1 | 2 | Fixed by user override, source/docs scope |
| IP17 | Default filter behavior may confuse chart truth | 1 | 2 | 3 | Fix now |
| IP18 | Settings are not yet the main assumption control surface | 1 | 1 | 2 | Fixed by user override, Bull assumptions |
| IP19 | No durable production refresh audit log | 0 | 2 | 2 | Later |
| IP20 | UI behavior test coverage is thin | 1 | 1 | 2 | Partially fixed by user override |

Fix-now scope for this triage:

- Extract or centralize only the monthly cash/running balance helpers needed to prevent Cash Flow/Scenario drift.
- Add focused regression tests for the known chart/scenario bugs.
- Audit and fix only clear `filteredData` misuse in management truth charts.
- Add operator-facing documentation for Work Month vs Date, refresh, validation warnings, Scenario reading, and release checklist.
- Keep validation/business-rule work narrow; do not redesign the parser or sheet schema in this phase.

Deferred backlog:

- IP01: decide future durable source-of-truth architecture.
- IP02: decide whether Vercel refresh should persist to durable storage.
- IP19: add durable production refresh/audit logging if the dashboard becomes a shared production tool.
- IP20: add broader UI/Playwright coverage after pure calculation tests are stable.

User-overridden fixed scope from 2026-04-23:

- IP12: actual COGS months now warn when Monthly Production Summary `totalCogs` differs from actual COGS outflows, or when `costPerContent` differs from `totalCogs / totalContent`.
- IP16: source/docs mojibake scan for `เธ`, `โ–`, `โ`, and replacement characters returns no matches in `app`, `components`, `lib`, and `tests`.
- IP18: Bull scenario assumptions are now normalized settings fields: `scenario.bullMonthlyCash` and `scenario.bullCreditTermMonths`.
- IP20: pure tests now cover Cash Flow balance derivation, Scenario current-month non-Actual rows, Production Summary cross-checks, and Bull scenario settings normalization.

## Invariants And Guardrails

- Never:
  - Treat local Vercel filesystem writes as durable storage.
  - Let `Cancelled` rows affect calculations.
  - Use negative amount signs to infer inflow/outflow direction.
  - Derive monthly Cash Flow balance from the last raw row for a Work Month.
  - Let ledger sidebar filter alter Cash Flow management overview.
  - Bulk-edit Thai keyword arrays through lossy terminal encoding.
  - Revert user changes or unrelated agent changes without explicit request.
  - Commit `node_modules`, `.next`, local dev logs, or backup noise.
  - Expand this dashboard into accounting, CRM, payroll, or multi-user admin unless the user explicitly changes scope.
- Always:
  - Use `Work Month` as the month basis for Cash Flow and Scenario charts unless the user explicitly changes the operating model.
  - Use `Date` as transaction timing/audit metadata, not as the primary monthly chart grouping for these views.
  - Prefer explicit sheet columns: `Main Category`, `Cost Behavior`, `Sponsor`, `Person`, `Status`.
  - Keep `Original Forecast` when a forecast becomes actual if forecast accuracy is needed.
  - Treat Forecast Accuracy as optional/hidden until there is enough `Original Forecast` history.
  - Keep production/content metrics secondary and calculate them only for months with actual content count.
  - Run focused verification after changing KPI/chart logic.
  - Update this brain when a decision changes project direction.
- Requires approval or explicit user instruction:
  - Destructive git operations.
  - Deleting backups/snapshots.
  - Changing Google Sheet schema.
  - Changing scenario business assumptions.
  - Introducing a database or replacing Google Sheet source of truth.
- Security/privacy assumptions:
  - Data is internal operating finance data.
  - Public CSV endpoints are currently used; do not broaden access beyond the existing Google Sheet sharing model without owner approval.

## Operating Commands

Use PowerShell from:

```powershell
cd D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
```

Install dependencies:

```powershell
npm.cmd install
```

Run dev server:

```powershell
npm.cmd run dev -- -p 3011
```

Test finance logic:

```powershell
npm.cmd run test:finance
```

Build:

```powershell
npm.cmd run build
```

Check git state:

```powershell
git status --short --branch
git log -5 --oneline
```

Refresh local snapshot through dev server:

```powershell
Invoke-WebRequest -Uri http://localhost:3011/api/refresh -Method POST -UseBasicParsing
```

Push:

```powershell
git push origin main
```

Common verification sequence:

```powershell
npm.cmd run test:finance
npm.cmd run build
git diff --check
git status --short --branch
```

## Known Risks

- Symptom: Cash Flow month-end balance looks wrong, such as May showing about `-7,887`.
  - Cause: deriving monthly balance from the last raw row for a Work Month, especially when sheet rows are interleaved.
  - Impact: management cash chart can show the wrong month crossing below zero.
  - First response: recompute balance by sorted Work Month from `openingBalance + monthly net`.
- Symptom: Scenario Base does not go negative when expected.
  - Cause: excluding non-Actual rows from the latest actual Work Month.
  - Impact: scenario starts too high and understates near-term cash risk.
  - First response: include non-Actual rows from latest actual Work Month onward.
- Symptom: Bear case looks equal to Base in a later month.
  - Cause: Bear delays non-ad customer cash by one month; once delayed cash arrives, cumulative running balance may catch up if there are no other differences.
  - Impact: running balance alone can hide monthly timing pain.
  - First response: inspect monthly net by case or add monthly net/delay impact display.
- Symptom: Refresh fails on Vercel with `ENOENT ... data/backups`.
  - Cause: serverless filesystem is not durable/writable like local dev.
  - Impact: refresh fails even if Google Sheet fetch works.
  - First response: keep Vercel refresh stateless and return refreshed snapshot directly.
- Symptom: Validation warns COGS rows but no production summary.
  - Cause: actual COGS month has no usable Monthly Production Summary row.
  - Impact: cost per content and production metrics are not management-ready.
  - First response: add/fix production summary for actual month.
- Symptom: Forecast accuracy is `N/A`.
  - Cause: actual rows lack `Original Forecast`.
  - Impact: forecast accuracy cannot be computed historically and may distract from cash decisions.
  - First response: hide or de-emphasize Forecast Accuracy until enough original forecast history exists.
- Symptom: Dashboard feels too busy for weekly/monthly decisions.
  - Cause: secondary metrics and diagnostics competing with Cash Flow and Scenario.
  - Impact: operator spends attention interpreting dashboard mechanics instead of making decisions.
  - First response: keep Cash Flow first, Scenario second, and move incomplete/immature metrics into secondary diagnostics.
- Symptom: Thai text appears mojibake in console.
  - Cause: terminal encoding mismatch.
  - Impact: accidental corruption risk if editing Thai text through lossy commands.
  - First response: use UTF-8-safe editor or known-good source values.
- Symptom: Git reports dubious ownership.
  - Cause: sandbox/current user differs from repo owner.
  - Impact: git commands may fail.
  - First response: use approved/safe git invocation or configure safe.directory only when appropriate.

## Recovery Playbooks

### If `/api/refresh` fails locally

1. Check dev server is running on the intended port.
2. Read the HTTP response body.
3. Check `app/api/refresh/route.ts` and Google Sheet access.
4. Retry with a fresh dev server on another port if an old server is stuck.
5. Do not delete the current snapshot while diagnosing.
6. Escalate to user if Google Sheet access or sharing has changed.

### If `/api/refresh` fails on Vercel

1. Check whether the error mentions filesystem paths such as `data/backups`.
2. Confirm the refresh route is still using stateless response behavior for serverless.
3. Confirm Google Sheet public CSV endpoints are reachable.
4. Do not add serverless writes as a permanent fix.
5. Escalate if durable production persistence is required.

### If Cash Flow chart looks wrong

1. Compute monthly totals from `data/current.json` grouped by `workMonth || month`.
2. Exclude `Cancelled`.
3. Start from `openingBalance`.
4. Add monthly `inflow - outflow` in sorted month order.
5. Compare the chart line against computed balances.
6. Do not use row-level `balance` as month-end truth if rows are interleaved.

### If Scenario chart looks wrong

1. Identify latest actual Work Month.
2. Starting cash should be latest actual balance on that Work Month.
3. Future rows should include non-Actual rows from latest actual Work Month onward.
4. Base uses current non-cancelled Committed/Forecast path.
5. Bull adds THB 30,000 monthly starting two months after latest actual month.
6. Bear shifts all future non-ad customer revenue inflows by one month.
7. Ad revenue stays on its original month.

### If Google Sheet schema changes

1. Stop before editing parser assumptions.
2. Compare headers with expected parser fields.
3. Update parser/header aliases only after understanding business meaning.
4. Add or adjust validation warnings.
5. Run `npm.cmd run test:finance` and `npm.cmd run build`.
6. Update this brain and any operator notes.

### If the dashboard becomes too broad

1. Check whether the requested feature supports weekly/monthly management decisions.
2. Check whether it belongs to accounting, CRM, payroll, or permission administration.
3. If it belongs to an out-of-scope system, document the need but do not implement it here.
4. If it supports cash/scenario decisions, keep the smallest useful version.
5. Verify the first screen still makes Cash Flow & Running Balance easy to read.

### If data snapshot is bad after refresh

1. Do not commit immediately.
2. Inspect `git diff -- data/current.json`.
3. Check row count and validation report.
4. If needed, restore from a known-good local backup with `POST /api/restore`.
5. Ask user before deleting backups, snapshots, or making other destructive recovery changes.

## Decision Log

- 2026-04-19: Google Sheet remains source of truth. Local JSON snapshots are dashboard cache/backup, not primary truth.
- 2026-04-19: Vercel refresh must be stateless for filesystem persistence. Local writes are allowed locally; serverless writes are not durable.
- 2026-04-19: Scenario Plan and old What-If analysis were replaced with current-situation Base/Bull/Bear cash cases.
- 2026-04-19: Scenario chart uses `Work Month` to match Cash Flow chart, not transaction `Date`.
- 2026-04-19: Bear case shifts all future non-ad customer revenue inflows by one month. Ad revenue stays on schedule.
- 2026-04-19: Scenario must include non-Actual rows from the latest actual Work Month onward so current-month forecast/outflows affect near-term risk.
- 2026-04-19: Cash Flow & Running Balance must recompute monthly running balance from opening balance and sorted monthly net. It must not take the last raw row per month.
- 2026-04-23: This `PROJECT_BRAIN.md` was rewritten into a concise operational brain with explicit success criteria, guardrails, playbooks, and next safe action.
- 2026-04-23: User overrode the score threshold to fix IP12, IP16, IP18, and IP20 despite total score `2`; fixes stayed scoped to production-summary validation, source/docs mojibake cleanup, Bull scenario settings, and focused tests.
- 2026-04-23: User calibrated product direction toward a lean business overview dashboard for weekly/monthly decisions. Cash Flow & Running Balance is the main truth, Scenario is the decision companion, Forecast Accuracy should be reduced/removed for now, Google Sheet remains source of truth, and accounting/CRM/payroll/multi-user admin are out of scope.
- 2026-04-23: User confirmed Production Metrics option B: keep as medium-priority secondary metrics, with `Cost per Content` shown only when actual content count exists.
- 2026-04-23: Milestone 1 was closed with `IMPLEMENT_PLAN.md` and explicit completion artifacts. Milestone 2 started with Google Sheet contract and refresh reliability as the active workstream.
- 2026-04-24: Milestone 2 was closed after the active sheet contract, core-field validation rules, optional support-sheet fallback, atomic local refresh persistence, and Vercel/stateless no-write behavior were all documented and covered by focused verification. Live deploy verification remains deployment work.
- 2026-04-24: Milestone 3 was closed after current cash and scenario actual history were aligned to month-based balances, cancelled-only months stopped appearing in monthly cash rows, and management charts were detached from ledger filter state.
- 2026-04-24: Milestone 4 was closed after validation was regrouped into Critical/Management/Info buckets, legacy snapshots gained normalization into the new model, and the operator-facing summary panel was updated to match the new grouping.
- 2026-04-24: Milestone 5 was closed after the first screen was tightened around cash truth, a compact scenario preview was added to the cash page, validation was visually de-emphasized relative to decision surfaces, and user-facing copy was cleaned up for scenario, revenue, and cash P&L sections.
- 2026-04-25: Milestone 6 was closed after focused regression coverage was expanded to protect Bear-case delay logic, ad-revenue-on-schedule behavior, and the delayed-month projection horizon alongside the existing cash, refresh, and validation rules.
- 2026-04-25: Milestone 7 batch 1 aligned `GET /api/backups` and `POST /api/restore` with the stateless Vercel model, kept live verification manual, and updated operator docs to use Critical/Management/Info validation wording.
- 2026-04-25: Milestone 7 batch 2 verified the local release/recovery flow end to end. Local refresh and restore work, but successful restore is not enough by itself; restored backups must still pass validation before being trusted for management decisions.
- 2026-04-25: Milestone 7 release docs should keep the live verification step manual, keep `data/backups` local-only, and use Critical/Management/Info wording for validation instead of the older rendering-versus-management phrasing.

## Document Map

- `PROJECT_BRAIN.md`: central operating memory, project definition, guardrails, playbooks, next action.
- `IMPLEMENT_PLAN.md`: milestone path from current state to lean production-ready dashboard.
- `OPERATOR_MANUAL.md`: day-to-day operator guide for sheet entry, refresh, charts, scenario, warnings, and release checks.
- `GOOGLE_SHEET_CONTRACT.md`: active Google Sheet contract, field aliases, validation behavior, and refresh persistence notes.
- `README.md`: general project entry point if present.
- `package.json`: runnable scripts and dependency versions.
- `tests/financeDashboard.test.ts`: finance parser/metric regression tests.
- `data/current.json`: latest dashboard transaction snapshot.
- `data/production-summary.json`: latest production summary support snapshot.
- `data/sponsor-pipeline.json`: latest sponsor pipeline support snapshot.
- `lib/types.ts`: shared contracts and data shapes.
- `lib/transactionModel.ts`: refresh parser, validation, running balance recomputation.
- `lib/dashboardMetrics.ts`: KPI and normalized transaction formulas.
- `lib/settingsDefaults.ts`: default sheet IDs/GIDs/settings.
- `lib/refreshPersistence.ts`: local snapshot/support persistence and stateless refresh guard.
- `app/api/refresh/route.ts`: Google Sheet refresh endpoint.
- `components/charts/CashFlowChart.tsx`: Cash Flow & Running Balance chart.
- `components/sections/ScenarioPlannerSection.tsx`: Base/Bull/Bear scenario view.

## Roles

- Owner: user/operator.
- Product direction: user/operator decides business assumptions, Google Sheet structure, management meaning, and what is useful in weekly/monthly meetings.
- Project brain / architect: primary AI agent maintains system understanding, plans work, reviews tradeoffs, and updates this file when direction changes.
- Implementer: primary AI agent for small changes; worker subagents for larger implementation when explicitly authorized by the user.
- Reviewer: primary AI agent must review diffs, run verification, and check against guardrails before reporting completion.
- Approval authority:
  - User approves risky schema changes, destructive file/git operations, data deletion, and major architecture changes.
  - AI may run non-destructive read/build/test/status commands needed for normal maintenance.

## Last Updated / Last Verified

- Last updated: 2026-04-25.
- Last verified: 2026-04-25.
- Verified by: Codex primary agent.
- Verification source:
  - Read `PROJECT_BRAIN.md`, `IMPLEMENT_PLAN.md`, and `AGENTS.md` before work.
  - `npm.cmd run test:finance` passed 21 tests.
  - `npm.cmd run build` passed.
  - `git diff --check` passed with only LF/CRLF warnings.
  - Local verification confirmed backup listing, refresh, and restore behavior in filesystem mode.
