# Finance Dashboard Brain

Last updated: 2026-04-13

## 1. Purpose

This project is the Next.js 14 replacement for the original single-file `Dashboard.html` finance dashboard. The dashboard is for Fin Friend Media / EasyMoneyConcept and is meant to answer practical operating questions:

- How much cash do we have now?
- How long can we survive if recent burn continues?
- Which month is profitable or loss-making?
- Which sponsor revenue is already in the sheet or likely to arrive?
- How accurate were forecasts vs actuals?
- What happens if revenue, people cost, or COGS changes?
- Which transaction caused a number to move?

The current product direction is practical management first, visual polish second. The dashboard should not become a dense wall of charts again.

## 2. Repository And Runtime

Local project:

```text
D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
```

GitHub repository:

```text
https://github.com/Tusgof/Finance_Dashboard.git
```

Vercel:

- Vercel is connected to the GitHub repo.
- Pushing `main` should trigger a Vercel redeploy.
- Vercel will install dependencies from `package-lock.json`.
- Do not commit `node_modules`.

Common commands:

```powershell
cd D:\Fogust\Workspace\Easymoneyconcept\02-Finance\Finance_Dashboard
npm run dev -- --port 3001
npm run build
git status --short
git add .
git commit -m "Descriptive commit message"
git push origin main
```

Recent relevant commits:

- `ea49936 Refine dashboard workspace UX`
- `55fd7fb Split dashboard into management pages`
- `098435b Load supporting dashboard tabs on refresh`
- `051a4c3 Refocus dashboard on operating metrics`
- `2ec1c86 Normalize dashboard data model`

## 3. Technical Stack

- Next.js `14.2.5`
- React + TypeScript
- Chart.js `4.4.7`
- `chartjs-plugin-annotation`
- CommonJS `next.config.js`, not `next.config.ts`
- Path aliases use `@/lib/...` and `@/components/...`

Important Chart.js rule:

- All Chart.js registrations live in `lib/chartDefaults.ts`.
- Registered controller types currently need at least `BarController`, `LineController`, and `DoughnutController`.
- If runtime throws `"bar" is not a registered controller` or similar, add the relevant controller import and register it in `Chart.register(...)`.

## 4. High-Level Architecture

```text
Google Sheet
  Transactions
  Monthly Production Summary
  Sponsor Pipeline
  Lists
      |
      | /api/refresh fetches public CSV/gviz CSV
      v
data/current.json
data/production-summary.json
data/sponsor-pipeline.json
data/backups/*.json
      |
      | /api/data normalizes and merges local JSON
      v
DashboardClient React state
      |
      v
DashboardContext
      |
      v
Cash / Revenue / P&L / Scenario / Ledger pages
```

Primary architecture files:

- `app/page.tsx`: renders the dashboard client.
- `components/DashboardClient.tsx`: client-side state owner, data fetcher, refresh handler, active page controller.
- `components/DashboardContext.tsx`: context provider for raw transactions, filtered transactions, opening balance, production summary, sponsor pipeline, and filter state.
- `lib/types.ts`: core TypeScript contracts.
- `lib/transactionModel.ts`: normalizes raw data/file rows into dashboard-safe shapes.
- `lib/dashboardMetrics.ts`: main metric formulas used by current dashboard sections.
- `lib/dataUtils.ts`: formatting, filter helpers, revenue source lookup, cost helpers, settings loader.
- `lib/settings.ts`: server-side settings load/save/normalization.
- `lib/settingsDefaults.ts`: default settings and default Google Sheet config.
- `app/api/data/route.ts`: reads local JSON and returns normalized data.
- `app/api/refresh/route.ts`: pulls Google Sheets CSV, writes JSON snapshots, creates backups.
- `app/api/settings/route.ts`: reads/writes dashboard settings.
- `app/api/backups/route.ts`: lists backup JSON files.
- `app/api/restore/route.ts`: restores a backup into `current.json`.
- `app/globals.css`: global visual system, light theme, workspace shell, responsive rules.

## 5. Current UX Structure

The dashboard is split into pages instead of one long page:

- `Cash`: current cash, cash runway, cash alerts, running balance chart.
- `Revenue`: monthly revenue trend by sponsor, weighted sponsor pipeline, pipeline table.
- `P&L`: monthly P&L table, cost per content, headcount ratio, forecast accuracy, production summary.
- `Scenario`: best/base/worst forecast, break-even revenue, what-if sliders.
- `Ledger`: paged transaction table with search.

Current UX decision:

- Page navigation and data filters live in a left sidebar.
- The main content area shows only the selected page.
- `Data Scope` filter currently changes `filteredData`, which primarily affects the ledger and any chart/component still using `filteredData`.
- Management pages that need all-month analysis should use `rawData` and normalize internally.

## 6. Local Data Files

Expected data folder:

```text
data/
  current.json
  production-summary.json
  sponsor-pipeline.json
  settings.json
  backups/
    2026-04-13T20-00-00.json
```

`data/current.json` target shape:

```json
{
  "openingBalance": 124331.84,
  "rawData": [
    {
      "date": "2026-04-15",
      "dueDate": "2026-04-15",
      "workMonth": "2026-04",
      "month": "2026-04",
      "type": "Inflow",
      "status": "Forecast",
      "category": "Revenue",
      "mainCategory": "Revenue",
      "subCategory": "Sponsor",
      "desc": "Webull Apr",
      "amount": 40000,
      "originalForecast": 40000,
      "person": "",
      "costBehavior": "Fixed",
      "sponsor": "Webull",
      "note": "",
      "entity": "Revenue",
      "balance": 164331.84
    }
  ],
  "productionSummary": [],
  "sponsorPipeline": []
}
```

Actual `/api/data` behavior:

- Reads `data/current.json`.
- Reads production summary and sponsor pipeline from paths configured in settings.
- Merges them into the data response.
- Calls `normalizeDataFile(...)`.
- Falls back to empty arrays and `fallbackOpeningBalance` if something breaks.

## 7. Google Sheet Contract

Primary Google Sheet:

```text
https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/edit?gid=0#gid=0
```

Default `sheetId`:

```text
1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8
```

Required/expected tabs:

- `Transactions`
- `Monthly Production Summary`
- `Sponsor Pipeline`
- `Lists`

Current refresh implementation:

- Main transaction export uses:

```text
https://docs.google.com/spreadsheets/d/{sheetId}/export?format=csv
```

- Supporting tabs use:

```text
https://docs.google.com/spreadsheets/d/{sheetId}/gviz/tq?tqx=out:csv&sheet={sheetName}
```

Google Workspace MCP note:

- Direct Google Workspace MCP auth previously failed with `invalid_grant`.
- Public CSV export was the reliable fallback.
- If MCP auth is fixed later, prefer MCP for reading/writing sheet cells, but keep CSV refresh as the dashboard's production path unless there is a strong reason to change.

## 8. Transactions Sheet Schema

The target practical schema has 13 core columns:

| # | Column | Purpose |
|---|---|---|
| 1 | `Date` | Actual cash in/out date. |
| 2 | `Work Month` | Accounting/work month for P&L. Always use this for monthly P&L. |
| 3 | `Type` | `Inflow` or `Outflow`. |
| 4 | `Main Category` | `Revenue`, `COGS`, `OpEx`, or `CapEx`. |
| 5 | `Sub Category` | More specific category from the `Lists` tab. |
| 6 | `Description` | Short transaction detail. |
| 7 | `Amount` | Numeric amount only. No comma in raw value. |
| 8 | `Status` | `Actual`, `Committed`, `Forecast`, or `Cancelled`. |
| 9 | `Original Forecast` | Forecast locked at the time the forecast was made. |
| 10 | `Person` | Payee/person responsible, if relevant. |
| 11 | `Cost Behavior` | `Fixed` or `Variable`. |
| 12 | `Sponsor` | Customer/sponsor name for inflows. Blank for non-sponsor/non-revenue rows. |
| 13 | `Note` | Extra context. Must not be `???`. |

Allowed values:

- `Type`: `Inflow`, `Outflow`
- `Main Category`: `Revenue`, `COGS`, `OpEx`, `CapEx`
- `Status`: `Actual`, `Committed`, `Forecast`, `Cancelled`
- `Cost Behavior`: `Fixed`, `Variable`

Critical rules:

- Use `Work Month` for P&L, trend, and monthly grouping.
- `Date` is cash timing, not necessarily accounting month.
- `Amount` is always positive; sign comes from `Type`.
- `Cancelled` rows should not affect calculations.
- Forecast rows should keep `Original Forecast` if the forecast amount existed.
- Actual rows may have blank `Original Forecast` if no forecast existed.
- Do not put `???` in `Note`.
- Do not use display formatting like commas as the only representation of numbers.

Legacy columns:

- `Due Date`, `Entity`, and `Indirect` were considered legacy and should eventually be removed from the operational schema or ignored by the dashboard.
- `Month-Year` and `Running Balance` may remain as reference fields, but the dashboard should prefer `Work Month` and recomputed balance logic where possible.

Person normalization decision:

- `นิก`, `กัส`, `เอี๋ยว`, and directorship-style rows should be grouped as `กรรมการ` for dashboard-level people cost.
- Reason: separating directors is not currently useful enough for this management dashboard.

## 9. Lists Tab And Dependent Dropdowns

The user has a `Lists` tab that powers dependent dropdowns through Apps Script.

Transactions mapping:

- `Main Category`: column D
- `Sub Category`: column E

Lists mapping:

- Lists column A = `Revenue` subcategories
- Lists column B = `COGS` subcategories
- Lists column C = `OpEx` subcategories
- Lists column D = `CapEx` subcategories

The Apps Script listens to edits in `Transactions!D:D`, clears the old `Sub Category`, then applies a dropdown from the matching `Lists` column.

Future sheet cleanup must preserve:

- `Transactions` tab name unless dashboard config changes.
- `Lists` tab.
- The D -> E dependent dropdown behavior.
- The `Revenue`, `COGS`, `OpEx`, `CapEx` mapping.

## 10. Monthly Production Summary Tab

Purpose:

- Feeds Cost per Content.
- Transaction rows alone cannot know how many pieces of content were produced.

Target columns:

| Column | Purpose |
|---|---|
| `Work Month` | Month key like `2026-04`. |
| `Total Content` | All completed content count for the month. |
| `Organic Content` | Organic/non-client content count. |
| `Sponsored Content` | Client/sponsor content count. |
| `Sponsor` | Optional; can be blank at monthly aggregate level. |
| `Total COGS` | Optional sheet-side COGS reference. |
| `Cost per Content` | Optional sheet formula/reference. |

Current dashboard formula:

- `calculateCostPerContent(row, productionSummary)` finds the matching `workMonth`.
- It returns `row.cogs / summary.totalContent`.
- It does not currently use `summary.totalCogs` for the KPI if P&L row COGS exists.

Important implication:

- If `Total Content` is blank or `0`, the dashboard shows `N/A`.
- Future months with no content count should stay blank/0 rather than fake a number.

## 11. Sponsor Pipeline Tab

Purpose:

- Feeds forward-looking sponsor revenue and weighted pipeline.

Target columns:

| Column | Purpose |
|---|---|
| `Sponsor` | Sponsor/customer name. |
| `Deal Value` | Gross deal value. |
| `Status` | Pipeline status, such as committed/forecast/negotiating. |
| `Probability` | Probability percent, e.g. `60` for 60%. |
| `Expected Date` | Expected cash or deal date. |
| `Weighted Value` | Optional override. If blank, dashboard calculates it. |
| `Note` | Optional context. |

Weighted value formula:

```text
weightedValue = Weighted Value if provided
weightedValue = Deal Value * (Probability / 100) if Weighted Value is blank
```

Weighted pipeline formula:

```text
Weighted Pipeline = SUM(weightedValue for all Sponsor Pipeline rows)
```

Known sponsors from previous data:

- Eightcap
- InnovestX
- OceanLife
- Facebook
- TikTok
- เงินเทอร์โบ
- Webull
- TTB
- Insurverse

## 12. Refresh Pipeline

Refresh endpoint:

```text
POST /api/refresh
```

Implementation flow:

1. Load settings with `loadSettings()`.
2. Fetch the main CSV from `settings.refresh.csvExportUrl`.
3. Parse transactions.
4. Fetch optional supporting tabs:
   - `Monthly Production Summary`
   - `Sponsor Pipeline`
5. Ensure `data/` and `data/backups/` exist.
6. If `data/current.json` exists, copy it into `data/backups/{timestamp}.json`.
7. Write:
   - `data/current.json`
   - `data/production-summary.json`
   - `data/sponsor-pipeline.json`
8. Return:

```json
{
  "success": true,
  "count": 106,
  "productionSummaryCount": 9,
  "sponsorPipelineCount": 12
}
```

Backup timestamp format:

```text
YYYY-MM-DDTHH-MM-SS.json
```

Important deployment note:

- On Vercel, writing to the filesystem is not durable in the same way as local disk.
- Local refresh can write JSON files reliably.
- Production refresh may work only within serverless runtime constraints and should not be treated as a permanent database.
- Long-term robust architecture should use Google Sheet as source of truth and/or a durable storage layer, not serverless local files.

## 13. Normalization Rules

There are two normalization layers:

1. `app/api/refresh/route.ts` parses Google Sheet CSV into local JSON.
2. `lib/transactionModel.ts` normalizes local JSON again when `/api/data` reads it.

Date normalization:

- Accepts `YYYY-MM-DD`.
- Accepts `YYYY/M/D`, `YYYY.M.D`, `YYYY-M-D`.
- Accepts `D/M/YYYY`, `D.M.YYYY`, `D-M-YYYY`.
- Converts supported dates to `YYYY-MM-DD`.

Month normalization:

- Accepts `YYYY-MM`.
- Accepts a date and slices it to `YYYY-MM`.
- Accepts `M/YYYY` and returns `YYYY-MM`.
- Accepts English month names like `Apr 2026`.

Type normalization:

- Explicit `Inflow` or `Outflow` wins.
- If missing, `Revenue` implies `Inflow`; other categories imply `Outflow`.

Main category inference:

- Explicit canonical `Revenue`, `COGS`, `OpEx`, `CapEx` wins.
- Inflow or revenue-source keywords imply `Revenue`.
- Production keywords imply `COGS`.
- CapEx/equipment keywords imply `CapEx`.
- Default fallback is `OpEx`.

Status normalization:

- Valid statuses are `Actual`, `Committed`, `Forecast`, `Cancelled`.
- Unknown status defaults to `Forecast` in some parsing paths.

Cost behavior inference:

- Explicit `Fixed` or `Variable` wins.
- COGS/production/video/content-like rows tend to become `Variable`.
- Non-production rows tend to become `Fixed`.

Sponsor inference:

- If `Sponsor` exists, use it.
- For inflow rows without `Sponsor`, try to infer from configured revenue source keywords.
- If no match, sponsor is blank.

Person inference:

- If `Person` exists, use it.
- Some people-cost keyword fallback exists, but clean sheet data is preferred.

Running balance:

- `normalizeDataFile(...)` recomputes running balances from `openingBalance`.
- `Cancelled` rows are skipped when recomputing balance.
- Amount sign is based on `Type`: inflow adds, outflow subtracts.

## 14. Settings System

Settings files/API:

- Defaults: `lib/settingsDefaults.ts`
- Server load/save: `lib/settings.ts`
- API: `GET /api/settings`, `POST /api/settings`
- Local file: `data/settings.json`

Settings are normalized on load. Missing or invalid settings fall back to defaults and may rewrite `data/settings.json`.

Main settings groups:

- `revenueSources`: labels and keywords for sponsor/source inference.
- `costClassification`: fixed/production/onetime buckets, direct keywords, people cost keywords.
- `healthThresholds`: runway, margin, HHI, revenue drop, headcount ratio, break-even thresholds.
- `scenario`: slider defaults/ranges, projection months, lookback months.
- `refresh`: sheet ID, CSV export URL, supporting JSON paths, fallback opening balance.

Default scenario settings:

- `revenueTarget`: default `75000`, min `0`, max `200000`, step `1000`.
- `execSalaryAdjustmentPct`: default `0`, min `-50`, max `20`, step `5`.
- `productionCostAdjustmentPct`: default `0`, min `-30`, max `30`, step `5`.
- `variableCostReductionPct`: default `0`, min `-30`, max `30`, step `5`.
- `newDealRevenue`: default `0`, min `0`, max `100000`, step `1000`.
- `bestCaseRevenueLiftPct`: `20`.
- `worstCaseRevenueHaircutPct`: `20`.
- `projectionMonths`: `6`.
- `breakEvenLookbackMonths`: `3`.
- `runwayLookbackMonths`: `3`.

Default health thresholds:

- Cash runway healthy: `>= 6` months.
- Cash runway caution: `>= 3` months.
- Cash runway red: `< 3` months.
- Revenue drop warning: current revenue `< previous revenue * 0.5`.
- Headcount cost healthy: `< 50%`.
- Headcount cost caution: `50% - 70%`.
- Headcount cost red: `> 70%`.

Guideline:

- Put assumptions in settings if they materially affect management decisions.
- Do not put transaction-derived values in settings.

## 15. Filters

`FilterType` supports:

- `all`
- `actual`
- `committed`
- `forecast`
- `cancelled`
- month strings like `2026-04`

Filter logic:

```text
all        -> all raw rows
actual     -> rows where status = Actual
committed  -> rows where status = Committed
forecast   -> rows where status = Forecast
month      -> rows where workMonth || month equals the selected month
```

Current default:

- Dashboard starts with `currentFilter = 'actual'`.

Important:

- `filteredData` should be used for user inspection/filtering.
- Longitudinal metrics such as runway, P&L, revenue trend, and scenario should usually use `rawData` to avoid accidentally hiding months.

## 16. Formula Reference

### 16.1 Formatting

`fmt(n)`:

```text
Intl.NumberFormat('en-US', minimumFractionDigits = 2, maximumFractionDigits = 2)
```

### 16.2 Current Cash

Implementation:

```text
actualRows = normalized rows where status = Actual
if actualRows is empty:
  currentCash = openingBalance
else:
  currentCash = balance of the last actual row
```

Important:

- The rows are sorted by date and description before this calculation.
- Running balance is recomputed in normalization, so this should reflect actual cash movements if the source data is normalized correctly.

### 16.3 Monthly Revenue

Formula:

```text
Monthly Revenue[month] =
  SUM(amount)
  WHERE workMonth = month
  AND type = Inflow
  AND status != Cancelled
```

### 16.4 Monthly Outflow

Formula:

```text
Monthly Outflow[month] =
  SUM(amount)
  WHERE workMonth = month
  AND type = Outflow
  AND status != Cancelled
```

### 16.5 Average Monthly Net Burn

Implementation:

```text
actualMonths =
  months where at least one row in that workMonth has status = Actual
  sorted ascending
  take last settings.scenario.runwayLookbackMonths months

deficit[month] = Monthly Outflow[month] - Monthly Revenue[month]
deficits = only deficit values > 0

Average Monthly Net Burn =
  if deficits is empty: 0
  else AVG(deficits)
```

Default lookback:

```text
settings.scenario.runwayLookbackMonths = 3
```

### 16.6 Cash Runway

Formula:

```text
Cash Runway =
  if Average Monthly Net Burn <= 0: Infinite
  else Current Cash / Average Monthly Net Burn
```

Tone:

```text
green  = Infinite or runway >= healthyMin
amber  = runway >= cautionMin
red    = runway < cautionMin
```

Default thresholds:

```text
healthyMin = 6 months
cautionMin = 3 months
```

### 16.7 Cash Alerts

Runway low:

```text
runwayLow = finite(Cash Runway) AND Cash Runway < cautionMin
```

Monthly loss:

```text
currentMonth = latest month from union of revenue/outflow months
monthlyLoss = Monthly Revenue[currentMonth] < Monthly Outflow[currentMonth]
```

Revenue drop:

```text
previousMonth = month before currentMonth
revenueDrop =
  Monthly Revenue[currentMonth]
  < Monthly Revenue[previousMonth] * settings.healthThresholds.revenueDropRatio.warningMax
```

Default revenue drop threshold:

```text
warningMax = 0.5
```

### 16.8 Monthly P&L

Rows:

```text
rows = transactions in the workMonth where status != Cancelled
```

Revenue:

```text
Revenue =
  SUM(amount)
  WHERE type = Inflow
```

COGS:

```text
COGS =
  SUM(amount)
  WHERE type = Outflow
  AND mainCategory = COGS
```

Gross Profit:

```text
Gross Profit = Revenue - COGS
```

Gross Margin:

```text
Gross Margin % =
  if Revenue > 0: Gross Profit / Revenue * 100
  else N/A
```

OpEx:

```text
OpEx =
  SUM(amount)
  WHERE type = Outflow
  AND mainCategory = OpEx
```

Operating Profit:

```text
Operating Profit = Gross Profit - OpEx
```

Operating Margin:

```text
Operating Margin % =
  if Revenue > 0: Operating Profit / Revenue * 100
  else N/A
```

CapEx:

```text
CapEx =
  SUM(amount)
  WHERE type = Outflow
  AND mainCategory = CapEx
```

Net Profit as currently displayed:

```text
Net Profit = Operating Profit - CapEx
```

Net Margin as currently displayed:

```text
Net Margin % =
  if Revenue > 0: Net Profit / Revenue * 100
  else N/A
```

Important accounting note:

- This is pragmatic management logic.
- In formal accounting, CapEx is usually not expensed the same way as OpEx. Current dashboard subtracts CapEx for cash-oriented net profit visibility.

### 16.9 People Cost And Headcount Cost Ratio

People cost:

```text
People Cost =
  SUM(amount)
  WHERE type = Outflow
  AND person is not blank
```

Headcount cost ratio:

```text
Headcount Cost Ratio =
  if Revenue > 0: People Cost / Revenue
  else N/A
```

Default threshold interpretation:

```text
green  < 50%
amber  50% - 70%
red    > 70%
```

### 16.10 Actual Vs Forecast Variance

Monthly row actual amount:

```text
Actual Amount =
  SUM(amount * sign)
  WHERE status = Actual

sign = +1 for Inflow
sign = -1 for Outflow
```

Monthly original forecast:

```text
Original Forecast = SUM(originalForecast for all rows in the month)
```

Monthly variance:

```text
Variance % =
  if Original Forecast > 0:
    (Actual Amount - Original Forecast) / Original Forecast * 100
  else:
    N/A
```

Potential issue:

- This mixes signed net actual against unsigned forecast totals if the sheet uses `Original Forecast` for both inflow and outflow.
- For more rigorous variance, split revenue variance and cost variance separately.

### 16.11 Forecast Accuracy

Implementation:

```text
rows =
  transactions where status = Actual
  AND originalForecast > 0

actual = SUM(amount)
forecast = SUM(originalForecast)

Forecast Accuracy =
  if forecast = 0: N/A
  else 1 - ABS(actual - forecast) / forecast
```

Important:

- Accuracy is only meaningful if actual rows keep the original forecast amount.
- If actual rows have blank `Original Forecast`, accuracy returns `N/A`.

### 16.12 Cost Per Content

Implementation:

```text
summary = Monthly Production Summary row where summary.workMonth = pnlRow.month

Cost per Content =
  if summary missing or summary.totalContent <= 0: N/A
  else pnlRow.cogs / summary.totalContent
```

Important:

- Current dashboard uses P&L COGS from transaction rows, not `summary.totalCogs`, for the numerator.

### 16.13 Weighted Pipeline

Per deal:

```text
weightedValue =
  if Weighted Value exists: Weighted Value
  else Deal Value * (Probability / 100)
```

Total:

```text
Weighted Pipeline = SUM(weightedValue)
```

### 16.14 Scenario Forecast

Inputs:

```text
monthlyRows = buildMonthlyPnLRows(...)
recent = last settings.scenario.breakEvenLookbackMonths rows
currentCash = getCurrentCash(...)
projectionMonths = settings.scenario.projectionMonths
```

Average outflow:

```text
avgOutflow =
  AVG(COGS + OpEx + CapEx over recent rows)
```

Average revenue:

```text
avgRevenue =
  AVG(Revenue over recent rows)
```

Break-even revenue:

```text
Break-even Revenue = avgOutflow
```

Base case:

```text
baseInflow = avgRevenue
baseOutflow = avgOutflow
baseMonthlyNet = baseInflow - baseOutflow
baseEndingCash = currentCash + baseMonthlyNet * projectionMonths
```

Best case:

```text
bestInflow = avgRevenue * (1 + bestCaseRevenueLiftPct / 100)
bestMonthlyNet = bestInflow - avgOutflow
bestEndingCash = currentCash + bestMonthlyNet * projectionMonths
```

Worst case:

```text
worstInflow = avgRevenue * (1 - worstCaseRevenueHaircutPct / 100)
worstMonthlyNet = worstInflow - avgOutflow
worstEndingCash = currentCash + worstMonthlyNet * projectionMonths
```

Default:

```text
bestCaseRevenueLiftPct = 20
worstCaseRevenueHaircutPct = 20
projectionMonths = 6
breakEvenLookbackMonths = 3
```

### 16.15 What-If Scenario Panel

Recent rows:

```text
recentRows =
  latest P&L rows with revenue/cogs/opex/capex activity
  limited to breakEvenLookbackMonths
```

Base cost components:

```text
baseExecCost = AVG(peopleCost)
baseProdCost = AVG(cogs)
baseOtherCost = MAX(AVG(cogs + opEx + capEx) - baseExecCost - baseProdCost, 0)
```

Slider outputs:

```text
newExec = baseExecCost * (1 + peopleCostAdjustmentPct / 100)
newProd = baseProdCost * (1 + cogsAdjustmentPct / 100)
newBurn = newExec + newProd + baseOtherCost
netMonthly = revenueTarget - newBurn
```

Runway:

```text
if netMonthly >= 0:
  Cash Runway = Infinite
else:
  Cash Runway = currentCash / ABS(netMonthly)
```

Balance at projection month:

```text
Balance at Month N = currentCash + netMonthly * projectionMonths
```

Break-even revenue in What-If panel:

```text
Break-even Revenue = newBurn
```

## 17. Chart And Component Inventory

Current management sections:

- `CashOverviewSection`
- `RevenueSponsorSection`
- `PnLCostSection`
- `ScenarioPlannerSection`
- `TransactionTable`

Current active/newer charts:

- `CashFlowChart`: running cash flow/balance chart.
- `RevenueTrendChart`: monthly revenue trend by sponsor.
- `ScenarioForecastChart`: best/base/worst projection chart.

Older chart components still exist in `components/charts/`:

- `ActualForecastChart`
- `CategoryChart`
- `DirectIndirectDonutChart`
- `DirectIndirectStackedChart`
- `EntityChart`
- `FixedVarChart`
- `MarginChart`
- `PersonnelChart`
- `RevenueChart`
- `RunwayChart`

Important:

- Some older charts may no longer be rendered after the page-based UX refactor.
- Do not delete old charts casually unless verifying imports and build.

## 18. Backup And Restore

Backup route:

- `GET /api/backups` lists backup files in `data/backups`.
- Expected order: newest first.

Restore route:

- `POST /api/restore` with `{ "filename": "..." }`.
- Restores backup into `data/current.json`.
- Backup page redirects back to `/` after restore.

Local backup note:

- Works locally.
- Do not rely on serverless disk as long-term backup storage in Vercel.

## 19. Known Risks And Technical Debt

Thai mojibake risk:

- Some existing source files show mojibake strings when read through shell, especially old Thai keyword defaults and some UI symbols like baht signs.
- If the live UI shows broken Thai text, fix source encoding/strings directly.
- Do not edit large Thai keyword arrays blindly through a lossy terminal view.

Vercel persistence risk:

- The dashboard writes refreshed JSON to local files.
- On Vercel this is not durable database storage.
- Long-term fix should make Google Sheet the source of truth and either fetch at request time or persist snapshots to a proper store.

Forecast variance risk:

- Current variance formula is coarse.
- It can mix signed actual net against unsigned original forecast totals.
- A better version should separate:
  - Revenue variance
  - COGS variance
  - OpEx variance
  - Cash timing variance

CapEx risk:

- Current dashboard subtracts CapEx in displayed net profit for cash visibility.
- Formal P&L would normally handle CapEx differently.
- Keep this explicit in UI copy if finance precision matters.

Settings/data boundary risk:

- Values derived from transactions should not move into settings.
- Settings should only control assumptions, thresholds, keywords, and data source paths.

Google Sheet quality risk:

- If `Work Month`, `Main Category`, `Original Forecast`, `Person`, or `Sponsor` are incomplete, dashboard metrics will still render but may be misleading.

## 20. Google Sheet Cleanup Checklist

Before trusting dashboard numbers, verify:

- `Transactions` has all 13 target columns.
- `Work Month` is normalized as `YYYY-MM`.
- `Type` is only `Inflow` or `Outflow`.
- `Main Category` is only `Revenue`, `COGS`, `OpEx`, `CapEx`.
- `Sub Category` is mostly filled using the dependent dropdown.
- `Amount` is numeric.
- `Status` is only `Actual`, `Committed`, `Forecast`, `Cancelled`.
- `Original Forecast` is filled where meaningful for forecast/committed/forecast-to-actual tracking.
- `Person` is filled for people-cost outflows.
- Directors are grouped as `กรรมการ`.
- `Cost Behavior` is `Fixed` or `Variable` for outflows.
- `Sponsor` is filled for sponsor revenue rows, including Webull.
- `Note` does not contain `???`.
- `Due Date`, `Entity`, and `Indirect` are removed or ignored.
- `Monthly Production Summary` has rows for months with completed content.
- `Sponsor Pipeline` has probability and expected date for forward deals.

## 21. Development Guardrails

When editing:

- Read the affected component and metric helper first.
- Prefer changing metric formulas in `lib/dashboardMetrics.ts`, not inside JSX.
- Keep data normalization in `lib/transactionModel.ts`.
- Keep settings defaults in `lib/settingsDefaults.ts`.
- Keep server-side settings persistence in `lib/settings.ts`.
- Keep API parsing/refresh behavior in `app/api/refresh/route.ts`.
- Run `npm run build` before push.
- Do not use destructive git commands.
- Do not commit `node_modules`, `.next`, or local cache artifacts.

When adding a new metric:

1. Decide whether it is transaction-derived, support-sheet-derived, or settings-derived.
2. Add/adjust type definitions in `lib/types.ts`.
3. Add the calculation to `lib/dashboardMetrics.ts`.
4. Use the helper from a section component.
5. Make the UI label describe the business meaning, not the implementation.
6. Add fallback behavior for blank/incomplete sheet data.
7. Build and verify.

When changing Google Sheet schema:

1. Update the sheet.
2. Update `lib/types.ts` if the dashboard data contract changes.
3. Update `app/api/refresh/route.ts` CSV parsing if new source columns are needed.
4. Update `lib/transactionModel.ts` normalization.
5. Refresh locally.
6. Inspect `data/current.json`.
7. Build.
8. Push.

## 22. Current Working Assumptions

- The sheet is the human-maintained source of truth.
- The dashboard should be resilient to incomplete sheet data.
- The dashboard should be page-based and focused.
- The ledger should remain available for auditing every number.
- Future work should improve calculation correctness before visual polish.
- The user may keep using Claude/Sonnet in Chrome to clean the Google Sheet manually.
- Codex can validate and adjust dashboard code from local files and public CSV exports.
