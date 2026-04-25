# PROJECT_BRAIN.md

## 1. Project Definition
- **Purpose**: Internal finance dashboard that turns Google Sheet cash data into a decision-oriented web dashboard for Easymoneyconcept / Fin Friend Media.
- **Primary Users**: Founder/operator, with maintainers and AI agents as internal support users.
- **Problem Solved**: Weekly and monthly cash, revenue, cost, and scenario signals are difficult to read directly from raw Google Sheets.
- **Desired Outcome**: A reliable, lean dashboard where the operator can refresh data, review validation, and make cash-survival decisions from one place within seconds.
- **In Scope**: Google Sheet refresh, local JSON snapshots, cash truth, scenario analysis, monthly transaction drilldown/reconciliation, essential settings only, local backup/restore, validation rules, and support-sheet reads for production summary and sponsor pipeline.
- **Out of Scope**: Accounting system, CRM, payroll/bonus system, multi-user admin, database-backed redesign, auth-protected user management, and expansion of settings/configurability that does not directly improve decision-making.

## 2. Success Criteria
### Usable When:
- `GET /api/data` returns a normalized snapshot from local JSON without crashing.
- `POST /api/refresh` can fetch the Google Sheet and return refreshed data.
- Cash, revenue, P&L, scenario, ledger, settings, and backups pages render.
- Validation issues are grouped into `Critical`, `Management`, and `Info`.
- The first screen answers current cash position and near-term cash risk quickly enough for weekly and monthly decisions.

### Production-Ready When:
- `npm.cmd run test:finance` passes.
- `npm.cmd run build` passes.
- Local backup/restore works in filesystem mode and is blocked in stateless Vercel mode.
- Operators can explain top-level cash numbers from transaction rows and support-sheet rows.
- Cash truth and scenario outputs are decision-grade; secondary surfaces are acceptable at operator-grade so long as they do not distort cash decisions.

## 3. Tech Stack
| Layer | Technology | Version | Notes |
|:------|:-----------|:--------|:------|
| Language | TypeScript | 5.9.3 | From `package-lock.json` |
| Runtime | Node.js | `>=18.17.0` | Required by `next@14.2.5` engine |
| Framework | Next.js App Router | 14.2.5 | `app/` routes and pages |
| UI Library | React | 18.3.1 | With `react-dom` 18.3.1 |
| Styling | Global CSS + `next/font/google` Inter | [REQUIRES_INPUT] | Styling is in `app/globals.css`; no separate CSS framework |
| State Management | React Context + hook state | [REQUIRES_INPUT] | `DashboardContext`, `useState`, `useMemo`, `useEffect` |
| Database | None | [REQUIRES_INPUT] | No database config or schema found |
| ORM / Data Layer | Google Sheets CSV + local JSON snapshots | [REQUIRES_INPUT] | `lib/transactionModel.ts`, `data/*.json` |
| Authentication | None | [REQUIRES_INPUT] | No auth package or auth route found |
| API Layer | Next.js Route Handlers | 14.2.5 | `app/api/*/route.ts` |
| Testing | TypeScript compile + Node `assert/strict` | 5.9.3 / built-in | `npm.cmd run test:finance` |
| Build Tool | Next.js build / SWC | 14.2.5 | `next build` |
| Package Manager | npm | lockfile v3 | `package-lock.json` present |
| CI/CD | [REQUIRES_INPUT] | [REQUIRES_INPUT] | No `.github/workflows` or deploy config file found |
| Hosting/Deploy | Vercel | [REQUIRES_INPUT] | Referenced in repo docs and route behavior |
| Key Dependencies | `chart.js`, `chartjs-plugin-annotation`, `@types/node`, `@types/react`, `@types/react-dom` | 4.4.7 / 3.1.0 / 20.19.37 / 18.3.28 / 18.3.7 | Verified from lock file |

## 4. Architecture Overview
- **System Type**: Hybrid Next.js dashboard with serverless-style route handlers plus local filesystem persistence in non-Vercel mode.
- **Core Flow**: Operator updates Google Sheet -> refresh route fetches CSV -> parser normalizes rows and builds validation -> local mode persists `data/current.json` and support snapshots -> UI fetches `/api/data` and computes dashboard views from normalized transactions.
- **Core Components**:
  - `app/page.tsx`: main dashboard entry.
  - `components/DashboardClient.tsx`: data fetch, refresh action, page navigation, context provider.
  - `components/sections/CashOverviewSection.tsx`: cash summary and cash truth surface.
  - `components/sections/ScenarioPlannerSection.tsx`: Base/Bull/Bear scenario view.
  - `components/sections/RevenueSponsorSection.tsx`: revenue and sponsor-facing summaries.
  - `components/sections/PnLCostSection.tsx`: cash P&L and cost views.
  - `components/TransactionTable.tsx`: row-level ledger view.
  - `app/settings/page.tsx` + `app/settings/SettingsClient.tsx`: settings editor.
  - `app/backups/page.tsx` + `app/backups/BackupList.tsx`: local backup history and restore UI.
  - `lib/transactionModel.ts`: parsing, normalization, validation, support-sheet checks.
  - `lib/dashboardMetrics.ts`: KPI, monthly cash flow, scenario projection, runway helpers.
  - `lib/refreshPersistence.ts`: local-vs-stateless persistence behavior.
- **External Dependencies**: Google Sheets CSV/gviz endpoints, Vercel deployment target, Google Fonts via `next/font/google`.
- **Persistence/State**: Source of truth is Google Sheets; cached state is stored in `data/current.json`, `data/production-summary.json`, `data/sponsor-pipeline.json`, and `data/backups/*.json`; client runtime state lives in React state/context.
- **Integration Points**: `/api/data`, `/api/refresh`, `/api/settings`, `/api/backups`, `/api/restore`, Google Sheets workbook `1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8`.

## 5. Design Principles
- Prefer correctness and traceability over UI novelty.
- Keep Google Sheets as the source of truth unless a new store is intentionally introduced.
- Treat `Work Month` as the monthly reporting key and `Date` as audit timing.
- Keep cash truth and scenario views ahead of secondary metrics.
- Prioritize transaction drilldown and reconciliation before adding new decision surfaces.
- Use conservative normalization and explicit validation instead of silent inference.
- Keep settings/configuration lean; expand settings only when the setting directly changes decision-grade behavior.
- Raise input discipline gradually on important Google Sheet fields instead of pushing more normalization burden into dashboard code forever.
- Use mixed quality targets: cash and scenario changes must be decision-grade, while supporting surfaces may ship at operator-grade if they do not weaken cash truth.
- Keep serverless behavior stateless; only local mode may persist snapshots and backups.

## 6. Current Verified State
- **Last Verified**: 2026-04-25
- **Current Milestone**: Milestone 5 - Release Gate And Maintenance Baseline (complete).
- **Completed**: Dashboard pages, refresh route, local backup/restore flow, validation grouping, scenario charting, finance regression tests, README, operator manual, Google Sheet contract doc, this `PROJECT_BRAIN.md` rewrite to the 17-section operating template, root `IMPLEMENT_PLAN.md` creation, monthly cash reconciliation drilldown tied to chart cash truth, lean settings trimming so only refresh, cash-signal, and bull-scenario controls stay exposed, stricter critical-field discipline for `Work Month`, `Status`, `Main Category`, `Cost Behavior`, and `Original Forecast`, and the Milestone 5 release-gate closeout.
- **In Progress**: None. Milestones 2, 3, 4, and 5 are complete.
- **Pending**: None. Future work starts only at the next gated decision point in the active root `IMPLEMENT_PLAN.md`.
- **Plan File Convention**: `IMPLEMENT_PLAN.md` in project root is always the active implementation plan. Archived plans belong in `Backup_IMPLEMENT_PLAN/` using the `DDMMYYYY_IMPLEMENT_PLAN.md` naming format, with version suffixes when needed.
- **Latest Validation**: `npm.cmd run test:finance` passed on 2026-04-25; `npm.cmd run build` passed on 2026-04-25; `git diff --check` returned LF/CRLF warnings only and no diff errors on 2026-04-25.

## 7. Next Safe Action
- **Action**: Hold the stable maintenance baseline; the next safe action for new work is the next gated decision point in the active root `IMPLEMENT_PLAN.md`.
- **Preconditions**: Milestones 2, 3, and 4 remain verified and core docs reflect the shipped behavior.
- **Stop If**: Future work would bypass the gated decision process or weaken cash truth, scenario outputs, or sheet contract behavior.
- **Verify With**: Confirm the next planned change is explicitly approved at the next gate and the baseline still matches the shipped implementation.

## 8. Invariants & Guardrails
### Never:
- Never treat Vercel filesystem writes as durable storage.
- Never let `Cancelled` rows affect management calculations.
- Never use negative amount signs as the primary direction rule; `Type` is authoritative.
- Never manually edit `data/current.json`, `data/production-summary.json`, or `data/sponsor-pipeline.json` as normal workflow.
- Never broaden this dashboard into accounting, CRM, payroll, or multi-user admin without owner approval.

### Always:
- Always use `Work Month` for monthly cash and scenario grouping.
- Always keep backup/restore local-only and stateless behavior intact on Vercel.
- Always run finance tests and a production build before claiming feature work is complete.
- Always update operating docs when sheet contract or behavior changes.

### Requires Approval:
- Google Sheet schema changes.
- Destructive git operations or deleting backups/snapshots.
- Introducing a database, auth layer, or new durable persistence model.
- Changing business assumptions behind scenario logic or KPI meaning.

## 9. Operating Commands
```bash
# Setup
cd D:/Fogust/Workspace/Easymoneyconcept/02-Finance/Finance_Dashboard
npm.cmd install

# Development
npm.cmd run dev -- -p 3011

# Test
npm.cmd run test:finance

# Build
npm.cmd run build

# Deploy
git push origin main

# Status Check
git status --short --branch
git log -5 --oneline

# Rollback
Invoke-WebRequest -Uri http://localhost:3011/api/restore -Method POST -ContentType 'application/json' -Body '{"filename":"2026-04-24T18-07-41.json"}' -UseBasicParsing
```

## 10. Tech Stack Details & Conventions
- **Naming Convention**: React component files use PascalCase; utility and model files in `lib/` use camelCase file names; route folders under `app/api` are lowercase.
- **Directory Structure Convention**: UI pages live in `app/`; reusable UI in `components/`; charts under `components/charts/`; page sections under `components/sections/`; business logic in `lib/`; persisted local data in `data/`; finance regression tests in `tests/`.
- **Import Convention**: Project uses the `@/*` path alias from `tsconfig.json`; local imports commonly use alias imports instead of long relative chains.
- **Error Handling Pattern**: Route handlers use `try/catch` and return JSON error payloads with HTTP status codes; client refresh uses `alert()` for user-visible refresh errors.
- **Logging Pattern**: No dedicated app logger is present; tests use `console.log` / `console.error`; runtime code is mostly silent outside returned error payloads.

## 11. Known Risks & Failure Modes
| Symptom | Cause | Impact | First Response |
|:--------|:------|:-------|:---------------|
| Refresh fails on Vercel with filesystem-related errors | Serverless runtime is stateless | Snapshot refresh appears broken in production | Check that refresh path skips persistence when `VERCEL` is set |
| Cash month-end balance looks wrong | Month-end balance derived from row order instead of monthly net | Management cash chart becomes misleading | Recompute with `buildMonthlyCashFlowRows` logic |
| Scenario understates delay pain | Delayed inflows catch up later in cumulative balance | Bear/Base may look too similar at later months | Inspect monthly net by case, not only cumulative balance |
| Forecast accuracy stays unusable | `Original Forecast` is blank or invalid on actual rows | Forecast accuracy card remains misleading or `N/A` | Fix `Original Forecast` data or keep the metric de-emphasized |
| Support metrics look unreliable | Production summary or sponsor pipeline sheet is missing or invalid | Secondary metrics lose decision-grade quality | Check validation report and support-sheet fallback status |
| Restore succeeds but numbers still look unsafe | Older backup content may carry management issues | Operator may trust stale or low-quality snapshot | Re-open dashboard and review validation after restore |
| Repo documentation drifts | Core docs still point to the backup plan or stale plan references | Humans and AI agents lose a clean execution path | Keep the active plan synced and update references |

## 12. Recovery Playbooks
### If `/api/refresh` fails locally:
1. Check: `git status --short --branch`
2. Run: `npm.cmd run dev -- -p 3011`
3. Do NOT: edit snapshot JSON by hand to fake a refresh result
4. Escalate if: Google Sheet access or sharing changed and the fetch still fails

### If `/api/refresh` fails on Vercel:
1. Check: production response body for filesystem-related messages
2. Run: local verification with `npm.cmd run build`
3. Do NOT: add serverless file writes as a quick fix
4. Escalate if: production now requires durable persistence beyond stateless refresh

### If a restore is needed:
1. Check: `Invoke-WebRequest -Uri http://localhost:3011/api/backups -UseBasicParsing`
2. Run: `Invoke-WebRequest -Uri http://localhost:3011/api/restore -Method POST -ContentType 'application/json' -Body '{"filename":"<backup>.json"}' -UseBasicParsing`
3. Do NOT: delete the current snapshot before confirming the backup file exists
4. Escalate if: the restored snapshot still shows `Critical` issues or the backup is malformed

## 13. Decision Log
| Date | Decision | Reason | Consequence |
|:-----|:---------|:-------|:------------|
| 2026-04-19 | Keep Google Sheets as source of truth | Existing workflow is sheet-driven | App reads CSV and persists local snapshots only as cache/recovery |
| 2026-04-19 | Use `Work Month` as monthly reporting key | Cash and scenario views need stable monthly grouping | `Date` remains audit context, not chart grouping |
| 2026-04-19 | Keep Vercel refresh stateless | Serverless filesystem is not durable | Backup/restore are local-only operations |
| 2026-04-19 | Replace old what-if flow with Base/Bull/Bear scenario view | Operator needs simpler decision cases | Scenario logic is explicit in dashboard metrics |
| 2026-04-24 | Regroup validation into `Critical` / `Management` / `Info` | Operator needs action-oriented severity buckets | Legacy snapshots need normalization support |
| 2026-04-25 | Add approximate days-to-forecast-zero note without changing runway meaning | Operator wanted day-level timing signal | Cash runway stays monthly, timing note stays approximate |
| 2026-04-25 | Standardize implementation plan storage | The root plan must stay current and old plans must not be lost | `IMPLEMENT_PLAN.md` is the active plan, and archived plans live in `Backup_IMPLEMENT_PLAN/` |
| 2026-04-25 | Keep monthly reconciliation on full-snapshot truth, not ledger scope filters | Ledger filtering is for audit convenience only | Month drilldown stays aligned with the top-level cash chart |
| 2026-04-25 | Trim settings UI to refresh, cash-signal, and bull-scenario controls | The project direction is a lean cash-survival dashboard | Nonessential settings remain in saved schema but are no longer exposed in the browser |
| 2026-04-25 | Tighten canonical field validation without changing sheet meaning | Important fields should surface cleanup work instead of relying on silent recovery | Invalid `Work Month` and `Cost Behavior` now have explicit issue codes, and invalid `Original Forecast` values are ignored rather than normalized to zero |

## 14. Document Map
| Document | Purpose | Location |
|:---------|:--------|:---------|
| PROJECT_BRAIN.md | Single source of truth | `PROJECT_BRAIN.md` |
| IMPLEMENT_PLAN.md | Milestone execution plan | `IMPLEMENT_PLAN.md` |
| Backup_IMPLEMENT_PLAN/ | Archive of older implementation plans | `Backup_IMPLEMENT_PLAN/` |
| AGENTS.md | AI agent behavioral guidelines | `D:/Fogust/Workspace/Document/Prompt/AGENTS.md` |
| README.md | Repo entry point and operating model summary | `README.md` |
| OPERATOR_MANUAL.md | Day-to-day operation and recovery guidance | `OPERATOR_MANUAL.md` |
| GOOGLE_SHEET_CONTRACT.md | Active sheet contract and validation behavior | `GOOGLE_SHEET_CONTRACT.md` |
| tests/financeDashboard.test.ts | Finance regression coverage | `tests/financeDashboard.test.ts` |

## 15. Roles
- **Owner**: User/operator `[REQUIRES_INPUT]`
- **Architect**: Primary AI orchestrator plus owner approval on product direction
- **Implementer**: AI worker agents for substantial work; primary agent only for small or coordinating changes
- **Reviewer**: Primary AI orchestrator, with owner sign-off for risky decisions

## 16. Operating Policy
- **Main Policy**: Use an orchestrator-worker pattern: primary AI reads the core docs, plans the work, delegates substantial implementation to `gpt-5.4-mini` worker agents, then reviews and verifies the result.
- **Sub Policy**: Follow `D:/Fogust/Workspace/Document/Prompt/AGENTS.md` before major work; keep changes simple, surgical, and goal-driven.
- **Escalation Policy**: Stop and ask the owner when schema meaning changes, assumptions are ambiguous, destructive actions are needed, or verified repo state is insufficient to proceed safely.

## 17. Last Updated / Last Verified
- **Last Updated**: 2026-04-25
- **Last Verified**: 2026-04-25
- **Verified By**: Codex primary agent
- **Verification Method**: Read `PROJECT_BRAIN.md`, read active `IMPLEMENT_PLAN.md`, read `AGENTS.md`, scanned repo structure/config/docs/code paths, confirmed all 17 sections exist, verified document references against existing files, ran `npm.cmd run test:finance`, ran `npm.cmd run build`, and checked `git diff --check`.
