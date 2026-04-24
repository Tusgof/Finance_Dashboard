# IMPLEMENT_PLAN.md

Milestone plan for taking `Finance_Dashboard` from its current state to a lean production-ready internal finance dashboard.

This plan follows the latest project direction:

- `Cash Flow & Running Balance` is the main truth.
- `Scenario` is the decision companion.
- Google Sheet is the source of truth.
- The dashboard is for weekly and monthly management decisions.
- Out of scope: accounting system, CRM, payroll engine, and multi-user admin.

The order is intentional: stabilize the core truth first, then improve reliability, then harden the product for release.

## Handoff Map

- `README.md`: repo entry point, operating model summary, and doc entry links.
- `PROJECT_BRAIN.md`: scope, guardrails, verified state, and decision log.
- `GOOGLE_SHEET_CONTRACT.md`: active sheet contract, field aliases, validation rules, and refresh behavior.
- `OPERATOR_MANUAL.md`: day-to-day operating steps, warning reading, and recovery checklist.
- `IMPLEMENT_PLAN.md`: milestone status, release criteria, and handoff completion notes.

## Milestone Status

- Current milestone: Production-ready maintenance mode. Maintenance milestone M10 is complete.
- Maintenance milestone M9 status: Complete as of 2026-04-25.
- Maintenance milestone M10 status: Complete as of 2026-04-25.
- Maintenance milestone M11 status: Planned next as of 2026-04-25.
- Milestone 1 status: Complete as of 2026-04-23.
- Milestone 2 status: Complete as of 2026-04-24.
- Milestone 3 status: Complete as of 2026-04-24.
- Milestone 4 status: Complete as of 2026-04-24.
- Milestone 5 status: Complete as of 2026-04-24.
- Milestone 6 status: Complete as of 2026-04-25.
- Milestone 7 status: Complete as of 2026-04-25.
- Milestone 8 status: Complete as of 2026-04-25.
- Last status update: 2026-04-25.

## Milestone 1 Completion Record

M1 is complete because the project direction, scope boundaries, core metric roles, and owner-only decisions are now explicit enough for future work to proceed without redefining the product.

### Scope Checklist

- Product type: lean internal finance management dashboard.
- Primary operating use: weekly and monthly management decisions.
- Main truth surface: `Cash Flow & Running Balance`.
- Decision companion: `Scenario`.
- Source of truth: Google Sheet.
- Snapshot role: dashboard cache and operating artifact, not primary truth.
- Main user: founder/operator.
- Secondary users: future maintainers and AI agents.
- Core page scope: cash overview, cash flow, revenue/sponsor view, cash P&L, scenario, ledger.
- Support data scope: production summary and sponsor pipeline only where they support cash or business decisions.

### Metric Meaning Map

| Metric or Surface | Business Purpose | Use For | Do Not Use For |
| --- | --- | --- | --- |
| `Cash Flow & Running Balance` | Main cash truth by month | Weekly/monthly cash decision, runway risk, month-end balance | Ledger audit detail or row-level reconciliation by itself |
| `Scenario` | Decision companion for Base/Bull/Bear cash paths | Understanding cash risk under current, upside, and delayed-payment cases | Full forecasting platform or CRM-style pipeline management |
| `Current Cash` | Latest available cash anchor | Quick operating status | Replacing monthly cashflow review |
| `Revenue & Sponsor` | Revenue composition and sponsor visibility | Revenue quality review and sponsor-related cash context | Full CRM or sponsor operations |
| `Cash P&L` | Cash-basis inflow/outflow view | Management-level profitability and cost structure review | Formal accounting P&L |
| `Cost per Content` | Secondary production efficiency signal | Actual months with usable actual content count | Forecast-only production months |
| `Forecast Accuracy` | Future optional forecast discipline metric | Later review after enough `Original Forecast` history exists | Current decision-critical metric |
| `Ledger` | Row-level audit and investigation view | Explaining and tracing numbers | Changing top-level management cash truth through sidebar filters |
| `Validation Warnings` | Data-quality and decision-risk surface | Telling the operator which numbers are safe or risky | Hiding source data issues |

### Intentionally Excluded Features

- Double-entry accounting.
- Tax filing automation.
- Formal audited financial statements.
- Payroll execution or bonus engine.
- CRM or full sponsor management system.
- Multi-user permission/admin system.
- Durable database replacement for Google Sheet.

### Owner-Only Decisions

- Any change to Google Sheet schema.
- Any change to scenario business assumptions.
- Whether to hide or remove `Forecast Accuracy` from the visible dashboard.
- Whether to introduce durable production storage or a database.
- Any destructive restore/delete of snapshots or backups.
- Any expansion into accounting, CRM, payroll, or multi-user administration.

## Milestone 2 Start Record

M2 has started. The first work queue is intentionally narrow and should not change the live Google Sheet schema without owner approval.

### M2 First Work Queue

1. Audit current parser/header aliases against the actual Google Sheet tabs.
2. Document the active field contract for `Transactions`, `Monthly Production Summary`, `Sponsor Pipeline`, and `Lists`.
3. Verify refresh behavior locally and confirm failed refresh does not corrupt the last usable snapshot.
4. Confirm serverless refresh behavior remains stateless and does not depend on durable `data/backups` writes.
5. Review validation severity gaps for core fields only: `Work Month`, `Status`, `Main Category`, `Amount`, `Cost Behavior`, `Sponsor`, `Person`, and `Original Forecast`.
6. Keep all findings in docs or narrow validation changes before any schema proposal.
7. Active sheet contract documentation has been created in `GOOGLE_SHEET_CONTRACT.md`.
8. Optional support-sheet refresh fallback has been added for local filesystem mode so unusable support refreshes keep the last usable local support snapshot and emit a management warning.
9. Nonblank invalid `Original Forecast` values now emit a non-blocking management warning instead of staying silent.

## Milestone 2 Completion Record

M2 is complete because the sheet-to-snapshot contract is now explicit, guarded, and verified without requiring a live schema change.

### Closed M2 Outputs

- `GOOGLE_SHEET_CONTRACT.md` now documents the active contract for `Transactions`, `Monthly Production Summary`, `Sponsor Pipeline`, and `Lists`.
- Core-field validation is explicit for `Work Month`, `Status`, `Main Category`, `Amount`, `Cost Behavior`, `Sponsor`, `Person`, and `Original Forecast`.
- Optional support-sheet refresh fallback keeps the last usable local support snapshot instead of overwriting it with empty or invalid support data.
- Refresh persistence behavior is isolated in `lib/refreshPersistence.ts` so local filesystem mode and Vercel/stateless mode can be tested directly.
- Local refresh writes current/support snapshots through temporary files and keeps the previous snapshot readable if the write step fails before the swap.

### M2 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`
- Focused regression coverage now includes:
  - local support-sheet fallback behavior
  - local snapshot/support persistence and backup creation
  - Vercel/stateless no-write behavior
  - core-field validation severity split
  - invalid `Original Forecast` warnings

### What M2 Does Not Claim

- It does not claim durable production persistence on Vercel.
- It does not claim live deploy verification. That belongs to Milestone 7.
- It does not change Google Sheet schema or business meaning.

## Milestone 3 Completion Record

M3 is complete because monthly cash truth and scenario history now share the same month-based balance source, and management charts no longer inherit ledger-only filter state.

### Closed M3 Outputs

- `getCurrentCash` now derives current cash from month-based actual balances instead of trusting the last raw actual row balance.
- Scenario actual history and scenario starting cash now reuse monthly cash rows instead of row-level balance lookups.
- `ScenarioPlannerSection` normalizes rows with the active dashboard settings before building projections.
- Revenue and direct/indirect management charts now read the full snapshot so the ledger sidebar filter does not change top-level management truth.
- Monthly cash rows now ignore months that only contain cancelled transactions.

### M3 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`
- Focused regression coverage now includes:
  - month-end balance derivation from monthly net
  - excluded cancelled-only months
  - current cash and scenario actual history derived from monthly balances
  - current-month inclusion of non-Actual rows in Scenario

### What M3 Does Not Claim

- It does not change Base/Bull/Bear business meaning.
- It does not introduce a new forecasting model.
- It does not change Google Sheet schema or ledger filtering behavior for the ledger page itself.

## Milestone 4 Completion Record

M4 is complete because validation now matches the intended operator-action model instead of the older rendering-versus-management split.

### Closed M4 Outputs

- Validation now groups issues as `Critical`, `Management`, and `Info`.
- The validation summary panel now reflects the new grouping and uses direct operator-facing wording.
- Legacy snapshots that still contain `renderingWarnings` and `managementWarnings` are normalized into the new model when read.
- `invalid-original-forecast` and support-sheet local fallback are now treated as non-blocking informational issues.
- Focused regression tests cover both the new grouping behavior and legacy snapshot compatibility.

### M4 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`
- Focused regression coverage now includes:
  - Critical/Management/Info grouping for core-field issues
  - legacy validation report normalization
  - non-blocking info handling for `invalid-original-forecast`

### What M4 Does Not Claim

- It does not redesign the Google Sheet schema.
- It does not broaden support-sheet checks beyond business-relevant use.
- It does not replace later UI cleanup work in Milestone 5.

## Milestone 5 Completion Record

M5 is complete because the first screen now prioritizes decision surfaces instead of forcing the operator to parse validation and secondary metrics first.

### Closed M5 Outputs

- The cash page now leads with a tighter cash summary for current cash, runway, and pressure.
- Active cash warning signals are shown as a compact strip instead of equal-weight status cards.
- The cash page now includes a compact Scenario preview so the first screen answers both cash and downside questions without opening another page.
- Validation remains visible, but it no longer visually leads ahead of the active page content.
- The header and page copy now use more neutral operator-facing wording.
- Revenue and Cash P&L sections now use clearer operational copy and reduce the weight of immature metrics such as Forecast Accuracy.
- User-facing mojibake was removed from the touched dashboard surfaces, and Scenario Logic remains available in simple Thai.

### M5 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`

### What M5 Does Not Claim

- It does not change cash, scenario, refresh, or validation business logic.
- It does not add broad UI automation coverage yet. That belongs to Milestone 6.
- It does not redesign the whole application shell beyond the decision-first surfaces touched here.

## Milestone 6 Completion Record

M6 is complete because the regression suite now protects the main finance rules that previously broke in refresh, cash, validation, and scenario behavior without relying on brittle UI snapshots.

### Closed M6 Outputs

- The finance regression suite now covers support-sheet fallback and stateless refresh persistence.
- Validation coverage protects core-field severity grouping, legacy normalization, and invalid `Original Forecast` handling.
- Cash coverage protects monthly balance derivation from monthly net and excludes cancelled-only months.
- Scenario coverage protects anchoring to the latest actual month, inclusion of non-`Actual` rows, Bear delay behavior for non-ad customer inflows, ad revenue staying on schedule, delayed-month projection horizon, and Bull default normalization.
- Test names stay aligned to the business rule or historical bug they protect.

### M6 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`

### What M6 Does Not Claim

- It does not add broad browser automation or visual regression coverage.
- It does not require live Google Sheet access in test runs.
- It does not change finance business logic; it locks the current behavior in place.

## Milestone 1 - Scope Lock and Baseline Freeze

**Objective**  
Lock the product scope, metric meaning, and baseline behavior before any additional logic or UI changes.

**Why It Matters**  
If scope is still moving, every change to data logic, validation, or UI can turn into a broad rewrite. This dashboard must stay lean and decision-focused.

**Scope**

- Confirm the product is a business overview dashboard, not a full accounting or CRM system.
- Confirm `Cash Flow & Running Balance` is the first-priority surface.
- Confirm `Scenario` is a decision companion, not a forecasting platform.
- Confirm `Forecast Accuracy` is secondary and can be hidden or de-emphasized until there is enough `Original Forecast` history.
- Confirm the out-of-scope boundary stays fixed: accounting, CRM, payroll engine, multi-user admin.
- Define the meaning of `Work Month`, `Date`, `Status`, `Main Category`, `Cost Behavior`, `Sponsor`, and `Person`.

**Deliverables**

- A single scope checklist that acts as the reference point.
- A metric meaning map showing what each KPI is used for.
- A clear list of intentionally excluded features.
- A short list of owner-only decisions that cannot be inferred by the implementation.

**Acceptance Criteria**

- No ambiguity remains about the monthly basis, cash truth, or scenario role.
- Each core metric has a documented business purpose.
- A new contributor can read the plan and avoid misreading the product direction.

**Verification**

- `git status --short --branch`
- Review `PROJECT_BRAIN.md` and `OPERATOR_MANUAL.md` against the current implementation.
- `npm.cmd run test:finance`
- `npm.cmd run build`

**Stop Conditions**

- Stop if a change would alter the meaning of a core metric or the Google Sheet contract.
- Stop if a request belongs to an out-of-scope system.

**Dependencies/Notes**

- This milestone depends on `PROJECT_BRAIN.md` being treated as the current product source of truth.
- It should be completed before any logic or presentation changes that could affect management meaning.

## Milestone 2 - Google Sheet Contract and Refresh Reliability

**Objective**  
Make the sheet-to-snapshot workflow deterministic, documented, and safe for both local and serverless refresh paths.

**Why It Matters**  
Google Sheet is the source of truth. If the contract between the sheet and the dashboard is unclear, every downstream number becomes questionable.

**Scope**

- Keep parsing and normalization aligned with the headers that are actually used.
- Validate the important fields: `Work Month`, `Status`, `Main Category`, `Amount`, `Cost Behavior`, `Sponsor`, `Person`, and `Original Forecast`.
- Ensure `Cancelled` rows never affect calculations.
- Ensure amount direction comes from business semantics, not from negative values.
- Classify warnings into renderable issues versus management-risk issues.
- Keep `POST /api/refresh` working for local use and for Vercel/serverless without relying on durable filesystem writes.
- Preserve the last usable snapshot if refresh or parsing fails.

**Deliverables**

- A stable refresh pipeline.
- Validation messages that explain what is wrong and what to fix.
- A sheet field contract document for the tabs that matter to the dashboard.
- Support-sheet handling that stays focused on cash and business decisions.

**Acceptance Criteria**

- A successful refresh produces a correct new snapshot.
- A failed refresh does not destroy the last usable snapshot.
- Validation clearly distinguishes renderable but risky data from data that should not be trusted for management decisions.
- No silent fallback hides data quality problems.

**Verification**

- `Invoke-WebRequest -Uri http://localhost:3011/api/refresh -Method POST -UseBasicParsing`
- `npm.cmd run test:finance`
- `npm.cmd run build`
- Inspect `data/current.json` after a refresh to confirm it matches the intended sheet state.
- Confirm the serverless refresh path does not depend on durable backup writes.

**Stop Conditions**

- Stop if the refresh contract requires a Google Sheet schema change.
- Stop if a proposed migration would make historical data meaning ambiguous.

**Dependencies/Notes**

- This depends on the current Google Sheet sharing and public CSV access pattern.
- Header aliases should be added conservatively, with no excessive inference.

## Milestone 3 - Cash Flow and Scenario Correctness

**Objective**  
Make monthly cash truth and scenario projections correct, consistent, and independent of raw row order.

**Why It Matters**  
This is the core of weekly and monthly management decisions. If the monthly cash view is wrong by one month, the decision model is wrong.

**Scope**

- Use `Work Month` as the monthly basis for both Cash Flow and Scenario.
- Recompute monthly running balance from `openingBalance + monthly net` after sorting by month.
- Do not use row-level `balance` as the month-end truth.
- Anchor Scenario to the latest actual month.
- Include non-`Actual` rows from the latest actual month onward in Scenario.
- Keep `Base`, `Bull`, and `Bear` on the same monthly basis as Cash Flow.
- Read `Bull` assumptions from normalized settings rather than hard-coding them in the component.
- Keep `Bear` behavior as a one-month delay for future non-ad customer revenue inflows while ad revenue stays on schedule.
- Use a monthly drilldown as the first diagnostic when the cash chart looks wrong.

**Deliverables**

- Shared monthly cash helpers used by Cash Flow and Scenario.
- Regression tests for interleaved rows, delayed cash, and current-month scenario behavior.
- Chart logic that matches the business meaning everywhere it is used.
- A plain-language scenario logic table that an operator can read quickly.

**Acceptance Criteria**

- Cash chart and scenario chart match each other on fixture data and on current live data.
- Interleaved rows do not produce incorrect month-end balances.
- `Base`, `Bull`, and `Bear` differ only in the intended assumptions.
- Running balance does not hide timing risk in a misleading way.

**Verification**

- `npm.cmd run test:finance`
- `npm.cmd run build`
- Compare chart output against manually computed monthly totals for a known problematic month.
- Verify that `Cancelled` rows are excluded from cash and scenario calculations.

**Stop Conditions**

- Stop if a change would alter the meaning of `Work Month` or scenario assumptions.
- Stop if historical management interpretation could change without owner review.

**Dependencies/Notes**

- This depends on the normalized settings and parser behavior from Milestone 2.
- The target is a business-accurate cash decision surface, not a prettier chart.

## Milestone 4 - Validation Rules and Data Quality Gating

**Objective**  
Turn validation into an actionable decision aid instead of generic noise.

**Why It Matters**  
The dashboard is only trustworthy if it tells the operator which numbers are decision-grade and which ones still need cleanup.

**Scope**

- Classify warnings as `Critical`, `Management`, or `Info`.
- Separate render blockers from warnings that still allow the page to load.
- Cover missing or malformed core fields with clear validation messages.
- Keep the existing actual COGS versus Monthly Production Summary cross-check.
- Show `Cost per Content` only when actual content count exists and the production data is usable.
- Keep `Forecast Accuracy` from distracting from cash/scenario decisions when `Original Forecast` history is insufficient.
- Keep sponsor pipeline and production summary checks only where they support cash or business decisions.

**Deliverables**

- A warning taxonomy with clear operator action.
- A validation summary that surfaces the top issues first.
- Tests for the business-rule warnings that matter most.
- Short UI copy for each severity level.

**Acceptance Criteria**

- Critical warnings identify data that should not be used for management decisions.
- Management warnings indicate cleanup that should happen before relying on the number.
- Info warnings stay informational and do not dominate the screen.
- Each warning has a clear purpose and action.

**Verification**

- `npm.cmd run test:finance`
- `npm.cmd run build`
- Review example data and fixtures to confirm warning severity is assigned correctly.
- Check that complete months are not flagged as broken.

**Stop Conditions**

- Stop if a new warning would require a schema redesign.
- Stop if a warning does not lead to a clear action.

**Dependencies/Notes**

- This builds on the stable parsing and metric logic from the earlier milestones.
- The goal is to make bad data visible, not to make the UI louder.

## Milestone 5 - Decision-First UI and UX Cleanup

**Objective**  
Make the first screen answer the cash and scenario questions immediately.

**Why It Matters**  
The owner should not need to inspect raw rows before understanding whether the business is safe for the current month.

**Scope**

- Keep Cash Flow as the first-truth surface.
- Keep Scenario close to the decision flow.
- Reduce the visual weight of `Forecast Accuracy` and other secondary metrics that are not mature.
- Keep the ledger as an audit view, not as the cash truth source.
- Use operational, plain-language copy.
- Ensure layout stability on desktop and mobile.
- Prevent text overflow and avoid layout shifts from labels, loading states, or value changes.
- Avoid decorative elements that do not help decision-making.

**Deliverables**

- A first screen that surfaces cash truth and scenario clearly.
- Section ordering that matches weekly and monthly review behavior.
- Labels, empty states, and tooltips that use business language.
- Responsive behavior that preserves readability on main target viewports.

**Acceptance Criteria**

- Opening the dashboard shows cash truth and scenario first.
- Secondary metrics do not distract from the main management questions.
- Layout remains stable on the main desktop and mobile sizes.
- Copy is short, direct, and operational.

**Verification**

- `npm.cmd run build`
- Open the dashboard in a browser and review the first screen, cash chart, scenario, and validation summary.
- Check layout behavior on desktop and mobile.

**Stop Conditions**

- Stop if a UI change makes cash or scenario harder to read.
- Stop if a new visual feature adds effort without adding decision value.

**Dependencies/Notes**

- This should happen after the logic in Milestones 2 through 4 is stable.
- If `Forecast Accuracy` is removed from the main view, do it without losing traceability in the data model.

## Milestone 6 - Testing and Regression Coverage

**Objective**  
Protect the important financial rules with tests so regressions do not return silently.

**Why It Matters**  
This is a finance dashboard used for decisions. A quiet regression in cash logic is a real operational risk.

**Scope**

- Keep or add tests for monthly cash derivation.
- Keep or add tests for scenario anchoring, inclusion of non-Actual rows, and Bear delay behavior.
- Keep or add tests for validation business rules.
- Keep or add tests for Bull/Bear settings normalization.
- Use fixtures that explain the business case being protected.
- Focus on financial correctness rather than brittle implementation snapshots.

**Deliverables**

- A regression suite that covers the known failure modes.
- Fixture data for cash, scenario, and validation logic.
- Test names that describe the bug or rule they protect.

**Acceptance Criteria**

- The known bug classes do not return silently.
- `npm.cmd run test:finance` passes on the current data set.
- `npm.cmd run build` still passes after the test coverage changes.

**Verification**

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git diff --check`

### Current Regression Coverage

The current finance regression suite already protects these bug classes:

- Local support-sheet fallback and stateless refresh persistence.
- Core-field validation splits and invalid `Original Forecast` handling.
- Monthly cash derivation from sorted monthly net, including cancelled-only month filtering.
- Scenario anchoring to the latest actual month, inclusion of non-`Actual` rows, and Bull default normalization.

These tests are meant to protect business behavior, not brittle implementation snapshots.

**Stop Conditions**

- Stop if a test requires live sheet access or makes CI unstable.
- Stop if a new test does not protect a real regression path.

**Dependencies/Notes**

- This depends on the core logic having enough stability to test against fixtures.
- Prefer tests for business behavior over tests for implementation details.

## Milestone 7 - Deployment, Operations, and Release Readiness

**Objective**  
Make refresh, release, and recovery work predictably in local and production environments.

**Why It Matters**  
The project is operated by a single owner, so release and recovery steps must be simple and repeatable.

**Scope**

- Define a short release checklist for local and production use.
- Confirm refresh behavior is stateless where required on Vercel.
- Confirm local backups are not treated as durable production storage.
- Confirm the latest pushed snapshot matches the intended Google Sheet state.
- Confirm live verification stays manual after Vercel finishes deploying.
- Confirm recovery playbooks exist for refresh failures, bad snapshots, and chart mismatches.
- Confirm the deploy path from `main` and the post-deploy live check.

**Deliverables**

- A practical release checklist.
- Recovery playbooks for refresh failure, bad snapshot, and chart mismatch.
- A live deployment verification step.
- Clear instructions for what can be restored safely and what requires owner approval.

**Acceptance Criteria**

- Deploy from `main` succeeds.
- Refresh works in the intended operating model.
- The team can verify the live deployment and the latest snapshot.
- An operator can recover from common failures without reading code first.

**Verification**

- `npm.cmd run test:finance`
- `npm.cmd run build`
- `git status --short --branch`
- `git diff --check`
- Confirm refresh flow locally and then check the live deployment manually after the redeploy.

**Stop Conditions**

- Stop if a release step has no documented playbook.
- Stop if a change would require destructive operations without owner approval.

**Dependencies/Notes**

- This milestone should be completed before the project is treated as production-ready.
- Any move toward persistent production storage or a database is a separate owner decision, not part of this plan.

### M7 Active Progress

- M7 batch 1 aligned `GET /api/backups` and `POST /api/restore` with the stateless Vercel model.
- Backups remain local-only and restore now returns a clear unavailable message in serverless mode.
- Operator docs now use `Critical`, `Management`, and `Info` wording and keep live verification as a manual post-deploy step.
- M7 batch 2 verified the local flow end to end: backup listing, local refresh, and local restore all work, but restored backups still need validation review before management use.
- Live verification is complete: the production dashboard loads, `GET /api/backups` returns `[]`, `POST /api/restore` returns the expected local-only `503`, and `POST /api/refresh` returns stateless persistence on Vercel.

## Milestone 8 - Documentation and Handoff Completion

**Objective**  
Make the dashboard understandable, maintainable, and recoverable without guesswork.

**Why It Matters**  
This project has financial context, multi-step data flow, and operational risk. Documentation reduces both maintenance time and mistakes.

**Scope**

- Update operator-facing documentation so it matches actual behavior.
- Explain `Work Month` versus `Date`.
- Explain refresh flow, validation severity, cash truth, and scenario reading.
- Explain what good looks like in a weekly or monthly decision meeting.
- Explain the release checklist and the common failure modes.
- Keep backup and restore wording local-only unless durable production storage is explicitly introduced later.
- Keep references to the main files easy to find.
- Keep maintainer guidance short: update the brain, contract, and operator manual together when the active contract or handoff flow changes.

**Deliverables**

- README or operational docs that do not conflict with actual behavior.
- A quick reference for sheet entry and refresh.
- A concise known-risks section.
- Handoff notes for future maintainers and AI agents.

**Acceptance Criteria**

- A new operator can refresh, read warnings, and interpret cash/scenario from the docs.
- The docs do not expand the product scope.
- The docs stay aligned with the implementation.

**Verification**

- Manual review of `OPERATOR_MANUAL.md`, `PROJECT_BRAIN.md`, and the live behavior.
- `npm.cmd run build`
- `npm.cmd run test:finance`

**Stop Conditions**

- Stop if the documentation must describe a feature that is not actually complete.

**Dependencies/Notes**

- This should happen after the behavior is stable.
- The docs should be an action guide, not an essay.

## Milestone 8 Completion Record

M8 is complete because the project now has a clear repo entry point, a stable handoff reading order, and synchronized operator/maintainer docs that match the verified local and live operating model.

### Closed M8 Outputs

- Added `README.md` as the repo entry point for operators and maintainers.
- Added a handoff reading order so a new maintainer can start from the right document instead of guessing.
- Tightened `PROJECT_BRAIN.md`, `GOOGLE_SHEET_CONTRACT.md`, and `OPERATOR_MANUAL.md` so they point to each other and describe the same verified operating model.
- Kept backup/restore wording explicitly local-only and Vercel refresh explicitly stateless.
- Kept maintainer guidance narrow: update the brain, contract, and operator manual together when verified operator behavior changes.

### M8 Verification Record

- Manual review of `README.md`, `PROJECT_BRAIN.md`, `GOOGLE_SHEET_CONTRACT.md`, and `OPERATOR_MANUAL.md`
- `npm.cmd run test:finance`
- `npm.cmd run build`

### What M8 Does Not Claim

- It does not introduce new runtime behavior.
- It does not change the Google Sheet schema or the finance model.
- It does not remove the need for future doc updates when verified behavior changes.

## Maintenance Milestone M9 Completion Record

M9 is complete because the cash summary now includes an approximate Base-path days-to-forecast-zero note while the monthly `Cash Runway` value stays unchanged.

### Closed M9 Outputs

- The cash summary now shows an additional timing note beside `Cash Runway`.
- The timing note is explicitly approximate and based on the `Base` forecast path.
- The monthly runway value remains the same burn-based metric it was before this maintenance pass.
- This is an additive maintenance update only; it does not change product scope, sheet meaning, or scenario behavior.

### M9 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- Manual review of the cash summary copy and documentation wording

### What M9 Does Not Claim

- It does not replace the monthly `Cash Runway` metric.
- It does not add day-level forecast logic.
- It does not change the Google Sheet contract or broaden product scope.

## Maintenance Milestone M10 Completion Record

M10 is complete because the approximate Base-path days-to-forecast-zero note no longer freezes at initial render; it now updates from the current local day while keeping the existing monthly runway and scenario meaning unchanged.

### Closed M10 Outputs

- The cash summary timing note now re-evaluates from the current local date on the client.
- The client schedules the next recompute at local midnight so the displayed days stay current without requiring a manual refresh.
- `Cash Runway` remains the monthly burn-based runway metric.
- The monthly Base/Bull/Bear scenario model remains unchanged.

### M10 Verification Record

- `npm.cmd run test:finance`
- `npm.cmd run build`
- Manual review of the cash summary timing note against the current local date

### What M10 Does Not Claim

- It does not replace the monthly `Cash Runway` metric.
- It does not add day-level forecast logic.
- It does not change the Google Sheet contract or broaden product scope.

## Maintenance Milestone M11

**Objective**
Align monthly transaction drilldown and reconciliation with the top-level cash truth so row-level inspection never tells a different monthly cash story.

**Why It Matters**
The dashboard is used to answer cash questions first. If the drilldown or reconciliation view disagrees with the monthly cash surface, operators waste time reconciling the dashboard against itself instead of making a decision.

**Scope**

- Keep the monthly transaction drilldown as a diagnostic view, not a second source of cash truth.
- Align reconciliation logic and wording with the same monthly basis used by `Cash Flow & Running Balance`.
- Make row-level inspection easier to connect back to month-end cash truth.
- Keep Google Sheet schema, scenario assumptions, and the monthly cash model unchanged.

**Deliverables**

- A clearer monthly drilldown or reconciliation path for cash investigation.
- Updated copy or helper logic that reflects the same monthly cash basis as the top-level view.
- Focused tests or fixtures for any cash-truth alignment behavior that changes.

**Acceptance Criteria**

- A monthly drilldown can be traced back to the same month-end cash truth shown on the main cash surface.
- The reconciliation path does not introduce a competing cash definition.
- The dashboard still reads as one cash model, not separate truth layers.

**Verification**

- `npm.cmd run test:finance`
- `npm.cmd run build`
- Manual review of a representative month where drilldown and reconciliation are used to explain cash movement

**Stop Conditions**

- Stop if the work would change the top-level monthly cash truth.
- Stop if the work requires a Google Sheet schema change or scenario assumption change.
- Stop if the requested behavior becomes accounting-system scope rather than dashboard scope.

**Dependencies/Notes**

- This milestone should stay narrow and support cash decision-making only.
- It depends on the existing monthly cash model and transaction data already used by the dashboard.

**What M11 Does Not Claim**

- It does not redefine monthly cash truth.
- It does not add accounting or ledger-system behavior.
- It does not expand the dashboard into new product scope.

## Production-Ready Exit Criteria

The project can be considered production-ready when all of the following are true:

- `GET /api/data` loads the latest snapshot.
- `POST /api/refresh` works against Google Sheet in the intended runtime environments.
- Cash, revenue, P&L, scenario, and ledger pages render without blocking errors.
- Cash Flow and Scenario use the same monthly basis and do not depend on raw row order.
- Scenario explains `Base`, `Bull`, and `Bear` clearly and uses the same cash truth model.
- Validation separates `Critical`, `Management`, and `Info` issues clearly.
- `npm.cmd run test:finance` passes.
- `npm.cmd run build` passes.
- Deployment from `main` succeeds.
- Operator and handoff documentation is enough to support refresh, review, and recovery.
