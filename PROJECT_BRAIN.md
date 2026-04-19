# PROJECT_BRAIN.md - Finance Dashboard

Last updated: 2026-04-19

This file is the central project brain for `Finance_Dashboard`. Use it as the first reference before changing code, data schema, Google Sheet structure, deployment settings, or dashboard logic.

## 1. Project Identity

Project name:

```text
Finance_Dashboard
```

Local path:

```text
D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
```

Repository:

```text
https://github.com/Tusgof/Finance_Dashboard.git
```

Product owner / business context:

- Finance Dashboard / Fin Friend Media.
- Internal management dashboard for tracking cash, runway, revenue, costs, forecast accuracy, sponsor pipeline, and transaction-level auditability.
- Replaces the earlier single-file dashboard at `D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Dashboard.html`.

Primary users:

- Founder/operator who needs quick business decisions.
- Finance/admin operator who refreshes Google Sheet data and checks transaction details.
- Future developer/AI agent maintaining the dashboard.

Core product principle:

- This is a practical management dashboard, not a formal accounting system.
- The dashboard should answer decisions clearly before adding visual polish.
- Every number shown in summary views should be traceable back to the transaction ledger or support sheet rows.

### 1.1 AI Execution Policy

Default project working model:

- The primary agent acts as the project brain: understands the full context, decides what should be done, designs the plan, reviews tradeoffs, and owns final integration quality.
- Implementation work should normally be delegated to a worker subagent using `gpt-5.4-mini` with reasoning effort `medium`.
- The primary agent should spawn the worker for non-trivial implementation, refactor, debugging, test-writing, or documentation update tasks.
- The primary agent should review the worker's diff, run or request verification, send revisions back when needed, and only accept the work after it is coherent with this project brain.
- The primary agent may work directly only for genuinely small tasks such as tiny documentation edits, one-line typo fixes, status checks, or simple inspections where delegation overhead would be larger than the task.
- Worker agents must be told that they are not alone in the codebase and must not revert unrelated user or agent changes.
- Worker tasks should have clear ownership, scoped files or responsibilities, expected verification, and a final report listing changed files.

## 2. Business Purpose

The dashboard exists to answer these operating questions:

- How much cash is available now?
- How many months can the company survive at the recent burn rate?
- Which month is profitable or loss-making?
- Which sponsor revenue is already actual, committed, forecast, or still pipeline?
- Which costs are COGS, OpEx, CapEx, people cost, fixed cost, or variable cost?
- What is cost per content, and is content production economically healthy?
- How accurate were original forecasts against actual outcomes?
- What happens to runway if revenue, people cost, production cost, or new deals change?
- Which transaction caused a KPI to move?

Non-goals:

- Full double-entry accounting.
- Tax filing logic.
- Inventory or depreciation accounting.
- CRM replacement.
- Permanent database replacement while data is still kept in Google Sheets.

## 3. Current Runtime And Stack

Framework:

- Next.js `14.2.5`
- React `18.3.1`
- TypeScript `^5`

Charting:

- Chart.js `4.4.7`
- `chartjs-plugin-annotation` `3.1.0`

Important runtime notes:

- Uses the Next.js App Router under `app/`.
- Uses server route handlers under `app/api/...`.
- Uses local JSON files under `data/` as dashboard snapshots.
- Uses Google Sheet public CSV/gviz CSV endpoints as the current refresh source.
- `next.config.js` is CommonJS.
- Path aliases use `@/lib/...` and `@/components/...`.

Common commands:

```powershell
cd D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
npm run dev -- --port 3001
npm run test:finance
npm run build
npm run start
git status --short
```

Package scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test:finance": "tsc -p tsconfig.test.json && node .test-dist/tests/financeDashboard.test.js"
}
```

Deployment:

- Vercel is connected to the GitHub repository.
- Pushing to `main` should trigger redeploy.
- Vercel installs from `package-lock.json`.
- Do not commit `node_modules`, `.next`, or local cache artifacts.

## 4. Source Of Truth And Data Flow

The human-maintained source of truth is the Google Sheet.

Default Google Sheet ID:

```text
1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8
```

Primary sheet URL:

```text
https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=0#gid=0
```

Connected Google Sheet tabs:

| Tab | GID | Browser URL | Dashboard use |
|---|---:|---|---|
| `Transactions` | `0` | `https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=0#gid=0` | Primary transaction ledger fetched by `settings.refresh.csvExportUrl`. |
| `Monthly Production Summary` | `1557377060` | `https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=1557377060#gid=1557377060` | Support sheet for content counts and cost per content. |
| `Sponsor Pipeline` | `931890610` | `https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=931890610#gid=931890610` | Support sheet for weighted forward-looking sponsor revenue. |
| `Lists` / `List` | `601994452` | `https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=601994452#gid=601994452` | Dropdown source for the Google Sheet; not currently fetched by the dashboard runtime. |
 
CSV endpoints used or verified:

```text
Transactions:
https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/export?format=csv&gid=0

Monthly Production Summary:
https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/gviz/tq?tqx=out:csv&sheet=Monthly%20Production%20Summary

Sponsor Pipeline:
https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/gviz/tq?tqx=out:csv&sheet=Sponsor%20Pipeline
```

Expected tabs:

- `Transactions`
- `Monthly Production Summary`
- `Sponsor Pipeline`
- `Lists` / `List`

Verification snapshot from 2026-04-19:

- `Transactions` CSV returned 513 non-empty data rows plus the opening-balance row.
- `Monthly Production Summary` CSV returned 8 data rows.
- `Sponsor Pipeline` CSV returned 12 data rows.
- `Lists` / `List` GID returned 9 data rows.
- `Monthly Production Summary` and `Sponsor Pipeline` are reachable through the gviz `sheet={name}` URLs used by `/api/refresh`.

Compatibility notes from the 2026-04-19 sheet check:

- `Transactions` header matches the parser's expected fields: `Date`, `Work Month`, `Type`, `Main Category`, `Sub Category`, `Description`, `Amount`, `Status`, `Original Forecast`, `Month-Year`, `Running Balance`, `Note`, `Person`, `Cost Behavior`, `Sponsor`.
- The opening balance row is represented through `Running Balance`, which `parseTransactionCsv(...)` already supports.
- `Monthly Production Summary` header matches the parser's expected fields and uses currency-formatted COGS/cost-per-content cells; `parseNumber(...)` already strips `฿` and commas.
- `Sponsor Pipeline` header matches the parser's expected fields.
- The dashboard does not currently fetch `Lists` / `List` at runtime. It is treated as a Google Sheet data-entry control, not as dashboard input.
- `/api/refresh` now adds non-blocking validation warnings when support sheets cannot be fetched, have invalid headers, or look empty.
- `/api/refresh` now validates the `Lists` GID as a lightweight dropdown integrity check, but the dashboard still does not use `Lists` for runtime calculations.
- Thai keyword inference remains a secondary fallback while the sheet provides explicit `Main Category`, `Cost Behavior`, `Sponsor`, and `Person` columns. If those explicit columns are blank or invalid, validation warnings are emitted before management users rely on inferred classifications.
- Do not bulk-edit Thai keyword arrays through a lossy terminal. Audit and repair Thai strings only with a UTF-8-safe editor and known-good source values.

Current data flow:

```text
Google Sheet
  Transactions
  Monthly Production Summary
  Sponsor Pipeline
  Lists
      |
      | POST /api/refresh
      | fetch public CSV / gviz CSV
      v
data/current.json
data/production-summary.json
data/sponsor-pipeline.json
data/backups/*.json
      |
      | GET /api/data
      | normalize and merge JSON files
      v
DashboardClient state
      |
      v
DashboardContext
      |
      v
Cash / Revenue / P&L / Scenario / Ledger pages
```

Critical deployment caveat:

- Local JSON writes work reliably on the local machine.
- Vercel/serverless filesystem writes are not durable database storage.
- Long-term production architecture should treat Google Sheet as source of truth and either fetch directly or persist snapshots to a durable store.

## 5. Application Architecture

Primary entry points:

- `app/page.tsx` renders `DashboardClient`.
- `app/layout.tsx` defines the root HTML shell and metadata.
- `app/globals.css` defines the global light UI system, dashboard shell, tables, cards, responsive behavior, and form controls.

Client state owner:

- `components/DashboardClient.tsx`
- Fetches `/api/data` on mount.
- Stores `rawData`, `openingBalance`, `snapshotMeta`, `validationReport`, `productionSummary`, `sponsorPipeline`, `currentFilter`, refresh state, and active page.
- Calls `POST /api/refresh` and uses the returned snapshot directly when present. This is required on Vercel because refreshed data cannot be persisted to the serverless filesystem.
- Provides state through `DashboardContext`.

Context:

- `components/DashboardContext.tsx`
- Exposes raw transactions, filtered transactions, opening balance, snapshot metadata, validation report, current filter setter, production summary, and sponsor pipeline.

Navigation / page model:

- Page-based dashboard, not one long scroll.
- Active pages:
  - `Cash`
  - `Revenue`
  - `P&L`
  - `Scenario`
  - `Ledger`

Server APIs:

- `GET /api/data`: reads local JSON files, merges support data, normalizes data, returns dashboard-safe JSON.
- `POST /api/refresh`: fetches Google Sheet CSV data, validates source rows, returns a full refreshed snapshot, and writes local snapshots/backups only when filesystem persistence is available.
- `GET /api/settings`: returns normalized dashboard settings.
- `POST /api/settings`: saves dashboard settings.
- `GET /api/backups`: lists local backup snapshots.
- `POST /api/restore`: restores a selected backup into `data/current.json`.

Core libraries:

- `lib/types.ts`: shared TypeScript contracts.
- `lib/transactionModel.ts`: raw JSON/CSV normalization and running balance recomputation.
- `lib/dashboardMetrics.ts`: business KPI formulas.
- `lib/dataUtils.ts`: formatting, filter helpers, settings fetch helper, revenue source helpers.
- `lib/settingsDefaults.ts`: default settings and default sheet config.
- `lib/settings.ts`: server-side settings load/save/normalization.
- `lib/chartDefaults.ts`: Chart.js registration and default styling.

## 6. File And Folder Map

Important files:

```text
app/
  api/
    backups/route.ts
    data/route.ts
    refresh/route.ts
    restore/route.ts
    settings/route.ts
  backups/
    BackupList.tsx
    page.tsx
  settings/
    SettingsClient.tsx
    page.tsx
  globals.css
  layout.tsx
  page.tsx

components/
  charts/
  sections/
  DashboardClient.tsx
  DashboardContext.tsx
  FilterBar.tsx
  Header.tsx
  HealthCards.tsx
  KpiGrid.tsx
  TransactionTable.tsx
  VideoProductionSection.tsx

data/
  current.json
  production-summary.json
  sponsor-pipeline.json
  settings.json
  backups/

lib/
  chartDefaults.ts
  dashboardMetrics.ts
  dataUtils.ts
  settings.ts
  settingsDefaults.ts
  transactionModel.ts
  types.ts
```

Current local snapshot observed on 2026-04-19:

- `data/current.json` has 106 transaction rows.
- Opening balance is `124331.84`.
- First transaction date observed: `2025-12-31`.
- Last transaction date observed: `2026-08-21`.
- `productionSummary` in `current.json` has 1 row.
- `sponsorPipeline` in `current.json` has 1 row.

## 7. UI Pages And Responsibilities

### 7.1 Cash

Component:

- `components/sections/CashOverviewSection.tsx`

Purpose:

- Show current cash.
- Show cash runway.
- Show warning cards for runway, latest monthly loss, and revenue drop.
- Show running cash/balance trend.

Key chart:

- `components/charts/CashFlowChart.tsx`

Key formulas:

- `getCurrentCash`
- `calculateCashRunway`
- `getCashAlerts`

### 7.2 Revenue

Component:

- `components/sections/RevenueSponsorSection.tsx`

Purpose:

- Show weighted sponsor pipeline.
- Show number of pipeline items.
- Show revenue trend by sponsor.
- Show pipeline table by deal.

Key chart:

- `components/charts/RevenueTrendChart.tsx`

Key formula:

- `calculateWeightedPipeline`

### 7.3 P&L

Component:

- `components/sections/PnLCostSection.tsx`

Purpose:

- Show cost per content.
- Show headcount cost ratio.
- Show forecast accuracy.
- Show latest net profit.
- Show monthly P&L table.
- Show monthly production summary table.

KPI card selection rules:

- `Cost per Content` uses the latest month that has a usable production count. It does not blindly use the latest future forecast month.
- `Headcount Cost Ratio` uses the latest month with both revenue and tracked people cost.
- `Forecast Accuracy` remains `N/A` until forecast rows become actual rows that preserve `Original Forecast`.
- `Latest Cash After CapEx` uses the latest month with actual transactions, falling back to the latest P&L row only if there are no actual months.

Key formulas:

- `buildMonthlyPnLRows`
- `calculateCostPerContent`
- `calculateForecastAccuracy`

### 7.4 Scenario

Component:

- `components/sections/ScenarioPlannerSection.tsx`

Purpose:

- Show current-situation cash projection based on the ledger's forecast running balance.
- Show Base, Bull, and Bear ending cash.
- Explain the scenario assumptions directly in the UI.
- Show projected running balance by cash month.

Scenario logic:

- `Base case`: uses current `Committed` and `Forecast` rows as the expected cash path.
- `Bull case`: adds THB 30,000 cash inflow every month starting two months after the latest actual cash month, representing two new clients closed per month with a two-month credit term.
- `Bear case`: shifts forecast sponsor/client inflows by one month while leaving ad revenue timing unchanged.
- All scenario rows use cash month from transaction `Date` where available, falling back to `Work Month`.
- The old break-even/slider based Scenario Plan and What-If Cash Scenario Analysis were removed because they were less useful for this operating model.

### 7.5 Ledger

Component:

- `components/TransactionTable.tsx`

Purpose:

- Transaction-level audit trail.
- Search and inspect raw source rows.
- Verify which transaction drives each KPI.

## 8. Data Contracts

### 8.1 Dashboard Data File

`DataFile` / `DashboardDataFile`:

```ts
{
  rawData: RawTransactionRow[];
  openingBalance: number;
  productionSummary: ProductionSummaryRow[];
  sponsorPipeline: SponsorPipelineDeal[];
  snapshotMeta?: DataSnapshotMeta;
  validationReport?: ValidationReport;
}
```

Primary local file:

```text
data/current.json
```

Support files:

```text
data/production-summary.json
data/sponsor-pipeline.json
data/settings.json
```

Snapshot metadata:

```ts
{
  capturedAt: string;
  sourceLabel: string;
  sourceKind: 'snapshot' | 'legacy';
  sourceUrl?: string;
}
```

Validation report:

```ts
{
  generatedAt: string;
  renderingReady: boolean;
  managementReady: boolean;
  renderingWarnings: ValidationIssue[];
  managementWarnings: ValidationIssue[];
  issues: ValidationIssue[];
}
```

Validation distinction:

- `renderingReady` covers rows that may still render after normalization but have source quality problems such as missing `Work Month`, unsupported dates, or blank/zero amounts.
- `managementReady` covers rows where normalized rendering is possible but management interpretation is risky, such as invalid status/category values, missing revenue sponsor, missing people-cost person, or missing production summary rows for COGS months.

### 8.2 Raw And Normalized Transactions

Persisted/source transaction rows use `RawTransactionRow`. `Transaction` remains as a backwards-compatible alias for existing component and helper imports.

Core raw transaction fields:

```ts
{
  date: string;
  dueDate?: string;
  workMonth?: string;
  month: string;
  type: 'Inflow' | 'Outflow';
  status: 'Actual' | 'Committed' | 'Forecast' | 'Cancelled';
  category: string;
  mainCategory?: 'Revenue' | 'COGS' | 'OpEx' | 'CapEx';
  subCategory?: string;
  desc: string;
  description?: string;
  amount: number;
  originalForecast?: number;
  person?: string;
  costBehavior?: 'Fixed' | 'Variable';
  sponsor?: string;
  note?: string;
  entity?: 'Revenue' | 'Video Production' | 'News Production' | 'Administrative' | 'Finance' | 'Marketing';
  balance: number;
}
```

Dashboard calculations should use `NormalizedTransaction` from `lib/dashboardMetrics.ts` after `normalizeTransactions(...)` has canonicalized status, category, sponsor/person fallback, cost behavior, and running balances.

Rules:

- `amount` is always positive.
- Sign comes from `type`.
- `Inflow` adds cash.
- `Outflow` subtracts cash.
- `Cancelled` rows should not affect calculations.
- `workMonth` drives monthly P&L and management reporting.
- `date` is cash timing.
- `dueDate` is legacy/supporting cash timing.
- `balance` is recomputed during normalization and should not be blindly trusted from the sheet.

### 8.3 Production Summary

Purpose:

- Provides content counts so the dashboard can calculate cost per content.

Shape:

```ts
{
  workMonth: string;
  totalContent: number;
  organicContent: number;
  sponsoredContent: number;
  sponsor?: string;
  totalCogs?: number;
  costPerContent?: number;
}
```

Rules:

- `workMonth` should be `YYYY-MM`.
- `totalContent <= 0` means cost per content becomes `N/A`.
- Current dashboard uses P&L COGS from transaction rows as numerator, not `totalCogs`, when calculating cost per content.
- Validation requires a usable production summary only for months with `Actual` COGS rows. Forecast-only COGS months may leave content counts blank because no real clip count exists yet.

### 8.4 Sponsor Pipeline

Purpose:

- Supports forward-looking revenue visibility.

Shape:

```ts
{
  sponsor: string;
  dealValue: number;
  status: string;
  probability: number;
  expectedDate?: string;
  weightedValue?: number;
  note?: string;
}
```

Weighted value rule:

```text
weightedValue = explicit Weighted Value if provided
weightedValue = Deal Value * Probability / 100 if explicit value is blank
```

## 9. Google Sheet Schema

### 9.1 Transactions

Target operational columns:

| # | Column | Meaning |
|---|---|---|
| 1 | `Date` | Actual cash movement date. |
| 2 | `Work Month` | Month for P&L and management reporting. |
| 3 | `Type` | `Inflow` or `Outflow`. |
| 4 | `Main Category` | `Revenue`, `COGS`, `OpEx`, or `CapEx`. |
| 5 | `Sub Category` | More specific category from `Lists`. |
| 6 | `Description` | Human-readable transaction detail. |
| 7 | `Amount` | Numeric amount only. |
| 8 | `Status` | `Actual`, `Committed`, `Forecast`, or `Cancelled`. |
| 9 | `Original Forecast` | Locked forecast amount where meaningful. |
| 10 | `Person` | Payee/responsible person for people cost. |
| 11 | `Cost Behavior` | `Fixed` or `Variable`. |
| 12 | `Sponsor` | Sponsor/customer name for revenue rows. |
| 13 | `Note` | Extra context. |

Allowed values:

- `Type`: `Inflow`, `Outflow`
- `Main Category`: `Revenue`, `COGS`, `OpEx`, `CapEx`
- `Status`: `Actual`, `Committed`, `Forecast`, `Cancelled`
- `Cost Behavior`: `Fixed`, `Variable`

Data quality rules:

- Do not put commas in raw numeric values unless CSV parsing can safely handle them.
- Do not use `???` in `Note`.
- Use `Work Month` for monthly management reporting.
- Keep `Original Forecast` when converting a forecast row to actual if forecast accuracy matters.
- Fill `Person` for people-cost outflows.
- Fill `Sponsor` for sponsor revenue rows.
- Group director/person aliases consistently when the dashboard-level view does not need personal separation.

Legacy fields:

- `Due Date`, `Entity`, `Indirect`, `Month-Year`, and `Running Balance` may exist from older versions.
- Dashboard should prefer `Work Month`, `Main Category`, `Cost Behavior`, `Sponsor`, and recomputed balance.

### 9.2 Lists

Purpose:

- Powers dependent dropdowns in the Google Sheet.

Expected mapping:

- `Transactions!D:D` = `Main Category`
- `Transactions!E:E` = `Sub Category`
- `Lists!A:A` = Revenue subcategories
- `Lists!B:B` = COGS subcategories
- `Lists!C:C` = OpEx subcategories
- `Lists!D:D` = CapEx subcategories

Guardrail:

- If the Google Sheet is cleaned or rebuilt, preserve the `D -> E` dependent dropdown behavior unless the dashboard parser and documentation are updated at the same time.

### 9.3 Monthly Production Summary

Expected columns:

- `Work Month`
- `Total Content`
- `Organic Content`
- `Sponsored Content`
- `Sponsor`
- `Total COGS`
- `Cost per Content`

### 9.4 Sponsor Pipeline

Expected columns:

- `Sponsor`
- `Deal Value`
- `Status`
- `Probability`
- `Expected Date`
- `Weighted Value`
- `Note`

Known sponsor/source labels in defaults:

- Eightcap
- InnovestX
- OceanLife
- เงินเทอร์โบ
- Webull
- Facebook Ads
- TikTok
- TTB
- Insurverse

## 10. Refresh Pipeline

Endpoint:

```text
POST /api/refresh
```

Implementation:

- `app/api/refresh/route.ts`

Flow:

1. Load settings through `loadSettings()`.
2. Fetch main transaction CSV from `settings.refresh.csvExportUrl`.
3. Parse CSV rows.
4. Fetch supporting tabs through Google gviz CSV:
   - `Monthly Production Summary`
   - `Sponsor Pipeline`
5. Fetch the `Lists` tab by GID for validation only.
6. Build a non-blocking validation report:
   - transaction row quality warnings
   - missing production summary warnings for months with `Actual` COGS rows
   - support-sheet fetch/header/empty warnings
   - lightweight Lists/dropdown integrity warnings
7. Build the refreshed dashboard snapshot in memory.
8. If filesystem persistence is available, ensure `data/` and `data/backups/` exist.
9. If filesystem persistence is available and `data/current.json` exists, copy it to `data/backups/{timestamp}.json`.
10. If filesystem persistence is available, write:
   - `data/current.json`
   - `data/production-summary.json`
   - `data/sponsor-pipeline.json`
11. On Vercel, skip filesystem writes and return the refreshed snapshot directly to the client.
12. Return the full snapshot, counts, snapshot metadata, validation report, and persistence mode.

Expected success response shape:

```json
{
  "success": true,
  "rawData": [],
  "openingBalance": 124331.84,
  "productionSummary": [],
  "sponsorPipeline": [],
  "count": 106,
  "productionSummaryCount": 1,
  "sponsorPipelineCount": 1,
  "snapshotMeta": {
    "capturedAt": "2026-04-19T00:00:00.000Z",
    "sourceLabel": "Google Sheets export snapshot",
    "sourceKind": "snapshot",
    "sourceUrl": "https://docs.google.com/..."
  },
  "validationReport": {
    "generatedAt": "2026-04-19T00:00:00.000Z",
    "renderingReady": true,
    "managementReady": true,
    "renderingWarnings": [],
    "managementWarnings": [],
    "issues": []
  },
  "persistence": {
    "mode": "stateless",
    "skippedReason": "Vercel serverless filesystem is read-only; refreshed data is returned directly."
  }
}
```

Timestamp format:

```text
YYYY-MM-DDTHH-MM-SS.json
```

CSV behavior:

- Main tab uses `/export?format=csv`.
- Supporting tabs use `/gviz/tq?tqx=out:csv&sheet={sheetName}`.
- `Lists` validation uses `/gviz/tq?tqx=out:csv&gid=601994452`.
- CSV parsing is custom and handles quoted commas.

Support-sheet warning behavior:

- Support sheet failures do not block refresh.
- `support-sheet-fetch-failed`: a support sheet or Lists tab could not be fetched.
- `support-sheet-invalid-header`: a support sheet or Lists tab returned an unexpected header.
- `support-sheet-empty`: a support sheet or Lists tab has no usable data/options after the header.
- These warnings are added to `validationReport.managementWarnings` so the dashboard can still render while management users see the trust problem.

Known auth note:

- Earlier Google Workspace MCP auth had `invalid_grant`.
- Public CSV/gviz CSV is the reliable current path.
- If Google auth is fixed later, MCP/direct API access can be considered, but refresh behavior should remain stable and documented.

## 11. Normalization Model

Primary normalization file:

- `lib/transactionModel.ts`

There are two relevant normalization stages:

1. `POST /api/refresh` parses Google Sheet CSV into local JSON.
2. `GET /api/data` reads local JSON and calls `normalizeDataFile(...)`.

Core parser and normalization responsibilities:

- Accept multiple date formats and normalize where possible.
- Derive `workMonth`.
- Infer `type` when missing from main category.
- Canonicalize `mainCategory`.
- Normalize status.
- Infer `costBehavior`.
- Infer `entity`.
- Preserve sponsor/person/note when provided.
- Recompute running balance from opening balance.
- Produce refresh validation warnings for source rows that are renderable but risky for management decisions.

Date formats accepted in `transactionModel.ts`:

- `YYYY-MM-DD`
- `YYYY/M/D`, `YYYY.M.D`, `YYYY-M-D`
- `D/M/YYYY`, `D.M.YYYY`, `D-M-YYYY`

Month formats accepted:

- `YYYY-MM`
- Full date, sliced to `YYYY-MM`
- `M/YYYY`
- English month names like `Apr 2026`

Status normalization:

- Valid: `Actual`, `Committed`, `Forecast`, `Cancelled`
- Unknown status falls back to a caller-provided fallback, usually `Forecast`.

Main category normalization:

- Explicit canonical values win.
- Revenue/inflow keywords imply `Revenue`.
- Production keywords imply `COGS`.
- Asset/equipment/capital keywords imply `CapEx`.
- Fallback is `OpEx`.

Running balance:

```text
balance = openingBalance
for each transaction:
  if status != Cancelled:
    balance += amount if type == Inflow
    balance -= amount if type == Outflow
```

Important implementation detail:

- `normalizeDataFile(...)` recomputes balances from `openingBalance`.
- `normalizeTransactions(...)` inside `transactionModel.ts` first recomputes with `0`, then `normalizeDataFile` recomputes again with `openingBalance`.
- Avoid adding additional balance mutation layers unless this is intentionally refactored.

## 12. Settings System

Files:

- Defaults: `lib/settingsDefaults.ts`
- Loader/saver: `lib/settings.ts`
- Local file: `data/settings.json`
- API: `app/api/settings/route.ts`
- UI: `app/settings/SettingsClient.tsx`

Settings groups:

- `revenueSources`
- `costClassification`
- `healthThresholds`
- `scenario`
- `refresh`

Default refresh config:

```ts
{
  sheetId: '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8',
  csvExportUrl: 'https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/export?format=csv&gid=0',
  productionSummaryPath: 'data/production-summary.json',
  sponsorPipelinePath: 'data/sponsor-pipeline.json',
  fallbackOpeningBalance: 124331.84
}
```

Refresh URL guardrail:

- `Transactions` should stay pinned to `gid=0`.
- Older local settings that still use `/export?format=csv` without `gid=0` are normalized to the pinned default when they match the known default sheet URL.
- Custom `csvExportUrl` values are preserved so temporary alternate sheets can still be tested intentionally.

Default health thresholds:

- Cash runway healthy: at least 6 months.
- Cash runway caution: at least 3 months.
- Gross margin healthy: at least 30%.
- Revenue drop warning: current revenue below 50% of prior month.
- Headcount cost healthy: below 50% of revenue.
- Headcount cost caution: 50% to 70% of revenue.

Default scenario assumptions:

- Revenue target: `75000`
- Projection months: `6`
- Break-even lookback months: `3`
- Runway lookback months: `3`
- Best case revenue lift: `20%`
- Worst case revenue haircut: `20%`

Current `data/settings.json` may be older than defaults:

- Missing keys are normalized in memory by `loadSettings()`.
- Do not assume the JSON file itself contains every current setting key.
- If settings behavior seems wrong, compare `data/settings.json` against `lib/settingsDefaults.ts`.

Settings guardrail:

- Settings should hold assumptions, thresholds, keyword mappings, data source paths, and scenario ranges.
- Transaction-derived facts should stay in transaction data, not settings.

## 13. Filters And Scope

Filter type:

```ts
'all' | 'actual' | 'committed' | 'forecast' | 'cancelled' | `${number}-${number}`
```

Current default:

```ts
currentFilter = 'actual'
```

Filter behavior:

- `all`: all rows.
- `actual`: rows where status is `Actual`.
- `committed`: rows where status is `Committed`.
- `forecast`: rows where status is `Forecast`.
- `cancelled`: rows where status is `Cancelled`.
- month string: rows where `workMonth || month` equals selected month.

Important UX/data distinction:

- `filteredData` is for inspection and scope controls, especially ledger-style views.
- Management metrics that need month-to-month continuity should usually use `rawData`, normalize internally, and avoid being accidentally narrowed by the sidebar filter.

## 14. KPI Formula Reference

### 14.1 Current Cash

```text
actualRows = normalized rows where status = Actual
if actualRows is empty:
  currentCash = openingBalance
else:
  currentCash = balance of last actual row
```

### 14.2 Monthly Revenue

```text
SUM(amount)
WHERE workMonth = month
AND type = Inflow
AND status != Cancelled
```

### 14.3 Monthly Outflow

```text
SUM(amount)
WHERE workMonth = month
AND type = Outflow
AND status != Cancelled
```

### 14.4 Average Monthly Net Burn

```text
actualMonths = months with at least one Actual row
recentMonths = last scenario.runwayLookbackMonths actualMonths
deficit[month] = monthlyOutflow - monthlyRevenue
Average Monthly Net Burn = average of positive deficits
```

If no positive deficit exists:

```text
Average Monthly Net Burn = 0
```

### 14.5 Cash Runway

```text
if Average Monthly Net Burn <= 0:
  runway = Infinite
else:
  runway = Current Cash / Average Monthly Net Burn
```

Tone:

- Green: infinite or at least healthy threshold.
- Amber: at least caution threshold.
- Red: below caution threshold.

### 14.6 Cash Alerts

Runway low:

```text
finite(runway) AND runway < cautionMin
```

Latest monthly loss:

```text
latestMonthRevenue < latestMonthOutflow
```

Revenue drop:

```text
currentMonthRevenue < previousMonthRevenue * revenueDropRatio.warningMax
```

### 14.7 Monthly P&L

For each `workMonth`, excluding `Cancelled` rows:

```text
Revenue = SUM(inflow amount)
COGS = SUM(outflow amount where mainCategory = COGS)
Gross Profit = Revenue - COGS
Gross Margin % = Gross Profit / Revenue

OpEx = SUM(outflow amount where mainCategory = OpEx)
Operating Profit = Gross Profit - OpEx
Operating Margin % = Operating Profit / Revenue

CapEx = SUM(outflow amount where mainCategory = CapEx)
Net Profit as displayed = Operating Profit - CapEx
Net Margin as displayed = Net Profit / Revenue
```

Accounting caveat:

- Formal accounting normally does not expense CapEx this way.
- This dashboard subtracts CapEx for cash-oriented management visibility.

### 14.8 People Cost And Headcount Ratio

```text
People Cost = SUM(outflow amount where person is not blank)
Headcount Cost Ratio = People Cost / Revenue
```

The P&L KPI card shows the latest month where both revenue and people cost are present, so future forecast months without complete attribution do not display as a misleading `0.0%`.

### 14.9 Actual Vs Forecast Variance

```text
Actual Revenue = SUM(actual inflow amount)
Revenue Forecast = SUM(originalForecast on actual inflow rows)
Revenue Variance % = (Actual Revenue - Revenue Forecast) / Revenue Forecast

Actual Cost = SUM(actual outflow amount)
Cost Forecast = SUM(originalForecast on actual outflow rows)
Cost Variance % = (Actual Cost - Cost Forecast) / Cost Forecast
```

Interpretation:

- Revenue and cost variance are intentionally split so revenue performance is not mixed with cash outflow timing.
- Forecast variance still depends on actual rows preserving `Original Forecast`.

### 14.10 Forecast Accuracy

```text
rows = Actual rows where originalForecast > 0
actual = SUM(amount)
forecast = SUM(originalForecast)
Forecast Accuracy = 1 - ABS(actual - forecast) / forecast
```

If no actual rows with original forecast:

```text
Forecast Accuracy = N/A
```

This is expected during the initial rollout of `Original Forecast`. The metric starts once a forecasted row is converted to actual while keeping its original forecast amount.

### 14.11 Cost Per Content

```text
summary = productionSummary row where workMonth = pnlRow.month
if summary missing or totalContent <= 0:
  N/A
else:
  Cost per Content = pnlRow.cogs / summary.totalContent
```

The P&L KPI card searches for the latest month with a usable production count instead of using the latest chronological month.

### 14.12 Weighted Pipeline

```text
weightedValue = explicit weightedValue OR dealValue * probability / 100
Weighted Pipeline = SUM(weightedValue)
```

### 14.13 Current Situation Cash Scenario

```text
startingCash = latest actual running balance
cashMonth = transaction Date month, falling back to Work Month

Base Net = SUM(committed/forecast inflows) - SUM(committed/forecast outflows)
Base Balance = previous Base Balance + Base Net

Bull Net = Base Net + 30000 starting two months after latest actual cash month
Bull Balance = previous Bull Balance + Bull Net

Bear Net = Base Net with forecast sponsor/client inflows shifted one month later
Bear Balance = previous Bear Balance + Bear Net
```

Bear case exclusion:

- Ad revenue timing is not shifted. Rows whose sponsor/subcategory/description/note include ad-related terms such as `ad`, `ads`, `facebook`, `meta`, or `tiktok` remain in their original cash month.

## 15. Chart Inventory

Chart registration:

- `lib/chartDefaults.ts`

Important rule:

- If Chart.js throws `"bar" is not a registered controller` or similar, add the relevant controller/element/scale import and register it in `Chart.register(...)`.

Currently active/newer charts:

- `CashFlowChart`
- `RevenueTrendChart`

Legacy chart components have been removed from the source tree after import checks and a build pass.

Guardrail:

- Keep the chart inventory updated if new chart entry points are added later.

## 16. Backup And Restore

Backup listing:

```text
GET /api/backups
```

Restore:

```text
POST /api/restore
{ "filename": "2026-03-21T11-24-37.json" }
```

Behavior:

- Backups live in `data/backups/`.
- Restore writes the selected backup snapshot to `data/current.json`.
- If a restored legacy backup has no `snapshotMeta`, restore adds legacy snapshot metadata from the backup file timestamp instead of pretending the restore time is the source capture time.
- Backup page redirects back to `/` after restore.

Risk:

- Local backup/restore is useful for development and local operation.
- Do not treat Vercel local filesystem backup files as permanent.

## 17. Development Guardrails

Before changing code:

1. Read the relevant component.
2. Read the metric helper in `lib/dashboardMetrics.ts`.
3. Read normalization code in `lib/transactionModel.ts` if data shape is involved.
4. Read settings defaults in `lib/settingsDefaults.ts` if assumptions/thresholds are involved.
5. Run `npm run build` before pushing.

Where changes belong:

- Metric formulas: `lib/dashboardMetrics.ts`
- Data normalization: `lib/transactionModel.ts`
- Shared contracts: `lib/types.ts`
- Settings defaults: `lib/settingsDefaults.ts`
- Settings persistence: `lib/settings.ts`
- Refresh parsing: `app/api/refresh/route.ts`
- Local data response: `app/api/data/route.ts`
- Page composition: `components/DashboardClient.tsx`
- Page-specific UI: `components/sections/...`
- Chart styling/registration: `lib/chartDefaults.ts` and `components/charts/...`

When adding a new metric:

1. Define the business meaning in plain language.
2. Identify source data: transaction, production summary, sponsor pipeline, or setting.
3. Add or update TypeScript types if needed.
4. Implement formula in `lib/dashboardMetrics.ts`.
5. Use the helper from the relevant section component.
6. Add fallback behavior for missing or incomplete sheet rows.
7. Verify with ledger rows.
8. Run a build.

When changing Google Sheet schema:

1. Update the sheet.
2. Update `lib/types.ts` if the dashboard contract changes.
3. Update CSV parsing in `app/api/refresh/route.ts`.
4. Update normalization in `lib/transactionModel.ts`.
5. Refresh locally.
6. Inspect `data/current.json`.
7. Run `npm run build`.
8. Update this `PROJECT_BRAIN.md`.

When changing settings:

1. Add defaults in `lib/settingsDefaults.ts`.
2. Update types in `lib/types.ts`.
3. Update normalization in `lib/settings.ts`.
4. Update `SettingsClient.tsx` if the user should edit it.
5. Decide whether old `data/settings.json` should be migrated or can rely on runtime normalization.

Git guardrails:

- Do not use destructive commands like `git reset --hard` unless explicitly requested.
- Do not revert unrelated user changes.
- Check `git status --short` before commit.
- Do not commit generated caches.

## 18. Data Quality Checklist

Before trusting dashboard numbers, verify:

- `Transactions` has the target 13 operational columns.
- `Work Month` is present and normalized as `YYYY-MM`.
- `Type` contains only `Inflow` or `Outflow`.
- `Main Category` contains only `Revenue`, `COGS`, `OpEx`, `CapEx`.
- `Sub Category` is filled through the dependent dropdown where possible.
- `Amount` is numeric and positive.
- `Status` contains only `Actual`, `Committed`, `Forecast`, `Cancelled`.
- `Original Forecast` is filled on rows where forecast accuracy matters.
- `Person` is filled for people-cost outflows.
- `Cost Behavior` is filled for outflows.
- `Sponsor` is filled for sponsor revenue rows.
- `Note` does not contain placeholders like `???`.
- `Monthly Production Summary` has content counts for months where actual cost per content matters. Forecast-only months do not need real content counts.
- `Sponsor Pipeline` has probability and expected date for forward-looking deals.
- Ledger rows can explain every summary KPI.

## 19. Known Risks And Technical Debt

### 19.1 Serverless Persistence

Local refresh writes JSON snapshots to disk and creates local backups. On Vercel, `/api/refresh` must not write to `/var/task`; it skips filesystem persistence and returns the refreshed snapshot directly to the client.

This fixes runtime errors such as:

```text
ENOENT: no such file or directory, mkdir '/var/task/data/backups'
```

A stronger long-term production architecture should use:

- Google Sheet as live source of truth, or
- durable object/blob/database storage for snapshots, or
- scheduled data sync into persistent storage.

### 19.2 Forecast Variance Scope

Forecast variance is now split into revenue and cost variance. Remaining scope risk:

- It still depends on `Original Forecast` being preserved when a forecast row becomes actual.
- It does not yet split cash timing variance from commercial variance.

### 19.3 CapEx Presentation

Current net profit subtracts CapEx for cash visibility. This is not formal accrual accounting. If the dashboard is used for investor/accounting reporting, label this more explicitly or split:

- Operating Profit.
- Cash After CapEx.
- Formal Net Profit, if depreciation/accounting rules are added.

### 19.4 Settings File Drift

`data/settings.json` can be missing newer default keys. Runtime normalization protects the app, but humans reading the JSON may see incomplete config. If settings become critical, add an explicit migration or rewrite normalized settings on load.

### 19.5 Thai Encoding / Mojibake

Some terminals can display Thai strings incorrectly. Avoid bulk-editing Thai keyword arrays through a lossy terminal view. If Thai UI text appears broken in the browser, fix source strings carefully with UTF-8.

### 19.6 Refresh Validation Coverage

Refresh now uses the canonical parser in `lib/transactionModel.ts` and returns a non-blocking validation report. Remaining validation risk:

- The report flags the highest-risk transaction and production-summary issues, but it is not yet an exhaustive Google Sheet contract validator for every tab and column.
- If the sheet schema grows, extend the validation layer before relying on inferred fallback behavior.

### 19.7 Incomplete Support Sheet Data

If production summary or sponsor pipeline has missing rows, the dashboard still renders but some KPIs become `N/A` or understated. This is intentional resilience, not proof data is complete.

### 19.8 Open Issue Backlog

This is the active issue backlog from the architecture review. Remove each item from this section only after the issue has been fixed, verified, and the relevant docs/code have been updated.

No open `PB-xx` items remain from the original architecture review. `PB-01` through `PB-15` have been implemented and verified through `npm run build`; formula/parser coverage is additionally verified through `npm run test:finance`.

Future issues should be added here with a new identifier and removed only after the issue has been fixed, verified, and the relevant docs/code have been updated.

## 20. Future Roadmap

High-value improvements:

- Add durable persistence for production deployment.
- Expand validation coverage to every Google Sheet tab and required column.
- Add full route-level integration tests for refresh/data/restore once a route test harness is introduced.
- Add sponsor concentration / HHI view if revenue diversification becomes a priority.
- Add exportable management summary for monthly review.

Lower-priority improvements:

- Clean old dashboard references.
- Add loading/error states per page instead of global alert.
- Improve settings UI coverage for every normalized setting.

## 21. Operating Playbooks

### 21.1 Refresh Data Locally

```powershell
cd D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
npm run dev -- --port 3001
```

Then open the dashboard and click `Refresh`.

Expected result:

- `data/current.json` is updated.
- Previous `data/current.json` is copied into `data/backups/`.
- `data/production-summary.json` and `data/sponsor-pipeline.json` are updated.
- UI reloads data through `/api/data`.

### 21.2 Restore A Backup

1. Open `/backups`.
2. Choose the backup snapshot.
3. Restore.
4. Confirm dashboard numbers return to expected state.

### 21.3 Diagnose Wrong KPI

1. Identify the page and KPI.
2. Find the formula in `lib/dashboardMetrics.ts`.
3. Check whether the page uses `rawData` or `filteredData`.
4. Inspect relevant rows in `TransactionTable`.
5. Inspect `data/current.json`.
6. Check source Google Sheet values.
7. Check normalization in `lib/transactionModel.ts`.
8. Fix the sheet first if the code is correctly interpreting bad source data.

### 21.4 Add A New Source Column

1. Add the column to Google Sheet.
2. Add field to `Transaction` or support type in `lib/types.ts`.
3. Parse it in `app/api/refresh/route.ts`.
4. Normalize it in `lib/transactionModel.ts`.
5. Use it in metrics/UI.
6. Refresh data.
7. Build.
8. Update `PROJECT_BRAIN.md`.

## 22. Current Working Assumptions

- Google Sheet is the business source of truth.
- Dashboard snapshots are derived artifacts.
- Dashboard should tolerate incomplete source data and show useful fallback states.
- Management pages should prioritize decision clarity over chart density.
- Ledger should remain available to audit every metric.
- `Work Month` is the correct period key for P&L.
- `Date` is cash movement timing.
- `Amount` is positive, sign comes from `Type`.
- `Cancelled` rows do not affect metrics.
- Forecast accuracy only works if actual rows retain original forecast values.
- Sponsor revenue quality depends on the `Sponsor` field and revenue source keyword settings.
- Cost per content quality depends on `Monthly Production Summary`.
- Scenario outputs are directional planning tools, not accounting forecasts.

## 23. Maintainer Checklist Before Push

Run:

```powershell
npm run build
git status --short
```

Confirm:

- Build passes.
- No `node_modules`, `.next`, or generated cache files are staged.
- Data file changes are intentional.
- `PROJECT_BRAIN.md` is updated if architecture, schema, formulas, or workflow changed.
- The dashboard still answers the core management questions clearly.
