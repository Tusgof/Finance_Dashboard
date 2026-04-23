# PROJECT_BRAIN.md

Central operating memory for `Finance_Dashboard`.

Use this file before changing code, data schema, Google Sheet structure, scenario logic, refresh behavior, deployment behavior, or management KPI formulas.

## Project Definition

- Purpose: provide an internal finance management dashboard for Easymoneyconcept / Fin Friend Media.
- Primary users: founder/operator, finance/admin operator, and future developer/AI agents maintaining the dashboard.
- Problem: finance data lives in Google Sheets and can be hard to interpret quickly for cash, runway, sponsor revenue, content cost, forecast risk, and transaction-level audit.
- Desired outcome: a dashboard that lets the operator see current cash, monthly inflow/outflow, running balance, revenue quality, cost structure, forecast variance, sponsor pipeline, and cash scenarios without manually rebuilding reports.
- In scope:
  - Google Sheet-backed transaction dashboard.
  - Cash overview, Cash Flow & Running Balance chart, Revenue & Sponsor view, Cash P&L view, Scenario Planner, Ledger.
  - Refresh from Google Sheets into local JSON snapshots.
  - Validation warnings for data that is renderable but risky for management decisions.
  - Scenario planning for Base, Bull, and Bear cash paths.
  - Support sheets for production summary and sponsor pipeline.
- Out of scope:
  - Double-entry accounting system.
  - Tax filing automation.
  - Formal audited financial statements.
  - Payroll execution.
  - CRM replacement.
  - Permanent database replacement while Google Sheets remains the source of truth.

## Success Criteria

The project is considered usable when:

- The dashboard loads from `data/current.json` through `GET /api/data`.
- `POST /api/refresh` can fetch Google Sheets and return a full refreshed snapshot.
- Cash, revenue, P&L, scenario, and ledger pages render without blocking errors.
- Every management metric can be traced back to transaction rows or support sheet rows.
- Validation issues distinguish rendering blockers from management warnings.
- Cash Flow & Running Balance uses a coherent monthly basis and does not depend on raw row order.
- Scenario Planner explains Base, Bull, and Bear assumptions clearly enough for non-technical operation.

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
- Keep charts aligned with their business question:
  - Cash Flow chart is operating cash overview and ignores ledger sidebar filters.
  - Ledger filter is for ledger inspection, not for changing top-level management cash truth.
- Do not hide data-quality risk. Warnings are better than silent inference for management use.
- Preserve backward compatibility for existing sheet headers where practical.
- Avoid destructive operations on snapshots/backups unless the user explicitly requests them.
- Do not commit build artifacts, local logs, `.next`, `node_modules`, or transient dev-server files.
- For non-trivial project work, the primary agent acts as project brain and delegates implementation to worker agents when the user explicitly permits subagents.

## Current Verified State

- Last verified: 2026-04-23, by local git/status inspection.
- Current branch: `main`.
- Latest known pushed commit: `8abf17e Refresh dashboard snapshot`.
- Git state before this document rewrite: `main...origin/main`, clean.
- Git state after this triage work: local worktree has uncommitted documentation, helper, chart, scenario, settings, validation, and test changes.
- Current milestone: management dashboard has working pages, Google Sheet refresh, support sheets, scenario chart, Cash Flow running balance fix, and pushed refreshed snapshot.
- Completed:
  - Replaced old scenario planner with current-situation Base/Bull/Bear cash cases.
  - Added scenario running balance chart with Actual History plus Base/Bull/Bear.
  - Bear case shifts all future non-ad customer revenue inflows by one month; ad revenue stays on schedule.
  - Scenario includes non-Actual rows from the latest actual Work Month onward.
  - Fixed Vercel refresh behavior so serverless refresh does not require writing `data/backups`.
  - Fixed Cash Flow & Running Balance so balance is recomputed by sorted Work Month from opening balance, not by last raw row per month.
  - Refreshed `data/current.json` from Google Sheet after TikTok date correction and later sheet date changes.
  - Added focused regression tests for Cash Flow monthly balance and Scenario current-month non-Actual rows.
  - Added `OPERATOR_MANUAL.md` for day-to-day sheet/dashboard operation.
  - Added Monthly Production Summary cross-check warnings for actual COGS total and cost-per-content mismatches.
  - Moved Bull scenario assumptions into normalized scenario settings.
  - Removed obvious mojibake from source/docs surfaces under `app`, `components`, `lib`, and `tests`.
- In progress:
  - Review and commit/push the 2026-04-23 improvement-triage changes if the user wants this batch published.
- Pending:
  - Validate the live Vercel deployment after GitHub/Vercel finishes redeploying latest commits.
  - Continue monitoring scenario and cash chart behavior as more future transaction rows are added.
- Latest validation known from recent work:
  - `npm.cmd run test:finance` passed 10 tests after IP12/IP16/IP18/IP20 changes.
  - `npm.cmd run build` passed after IP12/IP16/IP18/IP20 changes.
  - `git diff --check` passed with only LF/CRLF warnings.
  - Refresh via local dev server returned 148 transactions, 4 production summary rows, 12 sponsor pipeline rows, and 0 validation issues.

## Next Safe Action

- Action: commit and push the reviewed 2026-04-23 improvement-triage changes if the user approves publishing this batch.
- Preconditions:
  - `npm.cmd run test:finance` has passed.
  - `npm.cmd run build` has passed.
  - `git diff --check` has passed.
  - Review confirms worker changes match file ownership and project guardrails.
- Stop if:
  - A new diff appears outside the reviewed files.
  - Tests/build fail.
  - The user wants more review before publishing.
- Verify with:
  - `git status --short --branch`.
  - `git log -1 --oneline` after commit.
  - GitHub push success.
  - Optional deployed Vercel smoke check after redeploy.

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
- Always:
  - Use `Work Month` as the month basis for Cash Flow and Scenario charts unless the user explicitly changes the operating model.
  - Use `Date` as transaction timing/audit metadata, not as the primary monthly chart grouping for these views.
  - Prefer explicit sheet columns: `Main Category`, `Cost Behavior`, `Sponsor`, `Person`, `Status`.
  - Keep `Original Forecast` when a forecast becomes actual if forecast accuracy is needed.
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
  - Impact: forecast accuracy cannot be computed historically.
  - First response: preserve original forecast when converting forecast rows to actual.
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
5. Do not delete current snapshot while diagnosing.
6. Escalate to user if Google Sheet access or sharing has changed.

### If `/api/refresh` fails on Vercel

1. Check whether the error mentions filesystem paths such as `data/backups`.
2. Confirm refresh route is using stateless response behavior for serverless.
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

### If data snapshot is bad after refresh

1. Do not commit immediately.
2. Inspect `git diff -- data/current.json`.
3. Check row count and validation report.
4. If needed, restore from backup or previous commit.
5. Ask user before destructive restore/delete operations.

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

## Document Map

- `PROJECT_BRAIN.md`: central operating memory, project definition, guardrails, playbooks, next action.
- `OPERATOR_MANUAL.md`: day-to-day operator guide for sheet entry, refresh, charts, scenario, warnings, and release checks.
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
- `app/api/refresh/route.ts`: Google Sheet refresh endpoint.
- `components/charts/CashFlowChart.tsx`: Cash Flow & Running Balance chart.
- `components/sections/ScenarioPlannerSection.tsx`: Base/Bull/Bear scenario view.

## Roles

- Owner: user/operator.
- Product direction: user/operator decides business assumptions, Google Sheet structure, and management meaning.
- Project brain / architect: primary AI agent maintains system understanding, plans work, reviews tradeoffs, and updates this file when direction changes.
- Implementer: primary AI agent for small changes; worker subagents for larger implementation when explicitly authorized by the user.
- Reviewer: primary AI agent must review diffs, run verification, and check against guardrails before reporting completion.
- Approval authority:
  - User approves risky schema changes, destructive file/git operations, data deletion, and major architecture changes.
  - AI may run non-destructive read/build/test/status commands needed for normal maintenance.

## Last Updated / Last Verified

- Last updated: 2026-04-23.
- Last verified: 2026-04-23.
- Verified by: Codex primary agent.
- Verification source:
  - Located `PROJECT_BRAIN.md` in `D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard`.
  - `git status --short --branch` reported `## main...origin/main` before this rewrite.
  - `git log -5 --oneline` showed latest pushed commits through `8abf17e Refresh dashboard snapshot`.
  - `package.json` confirmed scripts and dependency versions.
