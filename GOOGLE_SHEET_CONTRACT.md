# GOOGLE_SHEET_CONTRACT.md

Active Google Sheet contract for `Finance_Dashboard`.

Workbook:

- Title: `Cashflow Dashboard`
- Locale: `th_TH`
- Timezone: `Asia/Bangkok`

This document is ASCII-only by design.

## Purpose

- Define the active sheet-to-dashboard contract for Milestone 2.
- Keep the refresh pipeline deterministic and easy to audit.
- Make the current parser aliases and validation behavior explicit.
- Separate the active contract from archived or backup sheets.

## Related Docs

- `PROJECT_BRAIN.md`: scope, guardrails, verified state, and decision log.
- `OPERATOR_MANUAL.md`: day-to-day operating steps and recovery checklist.
- `IMPLEMENT_PLAN.md`: active milestone status, release criteria, and handoff notes.

## Non-Goals

- No Google Sheet schema changes.
- No new dashboard features.
- No accounting, CRM, payroll, or database redesign.
- No new durable serverless backup system.
- No speculation beyond the current project plan.

## Active Source Tabs

| Tab | GID | Contract Status | Notes |
| --- | --- | --- | --- |
| `Transactions` | `0` | Active contract | Primary source for cash truth and ledger rows. |
| `Monthly Production Summary` | `1557377060` | Active contract | Support sheet for production metrics and COGS cross-checks. |
| `Sponsor Pipeline` | `931890610` | Active contract | Support sheet for sponsor pipeline context. |
| `Lists` | `601994452` | Active contract | Support sheet for category/list options. |
| `Backup before schema cleanup - 2026-04-13` | `816117252` | Archived, not active contract | Do not treat as the live schema. |

## Field Contract

### Transactions

The active transaction contract observed in the sheet is:

`Date, Work Month, Type, Main Category, Sub Category, Description, Amount, Status, Original Forecast, Month-Year, Running Balance, Note, Person, Cost Behavior, Sponsor`

Required fields for the active sheet contract:

| Field | Required | Accepted parser aliases | Meaning |
| --- | --- | --- | --- |
| `Date` | Yes | `Date`, `date` | Transaction timing and audit date. |
| `Work Month` | Yes | `Work Month`, `workMonth`, `work month`, `Month`, `month`, `Month-Year`, `month-year` | Monthly grouping key for cash views and scenarios. Enter canonical `YYYY-MM` values. |
| `Type` | Yes | `Type`, `type` | Cash direction. `Inflow` or `Outflow`. |
| `Main Category` | Yes | `Main Category`, `mainCategory`, `main category`, `Category`, `category` | Revenue, COGS, OpEx, or CapEx. Enter the canonical category text. |
| `Description` | Yes | `Description`, `description`, `Desc`, `desc` | Human-readable row label. |
| `Amount` | Yes | `Amount`, `amount` | Absolute amount. Direction comes from `Type`, not from sign. |
| `Status` | Yes | `Status`, `status` | `Actual`, `Committed`, `Forecast`, or `Cancelled`. Enter the canonical status text. |
| `Sub Category` | No | `Sub Category`, `subCategory`, `sub category` | Optional detail label. |
| `Original Forecast` | No | `Original Forecast`, `originalForecast`, `original forecast` | Optional legacy forecast anchor used for forecast accuracy only. Invalid nonblank values are treated as cleanup work, not as real forecasts. |
| `Running Balance` | No | `Balance`, `balance`, `Running Balance`, `running balance` | Compatibility field only. The dashboard recomputes running balance. |
| `Note` | No | `Note`, `note` | Free-form note. |
| `Person` | No | `Person`, `person` | Required by validation when the row is a people-cost outflow. |
| `Cost Behavior` | No | `Cost Behavior`, `costBehavior`, `cost behavior` | Required by validation for outflow rows. Enter `Fixed` or `Variable`. |
| `Sponsor` | No | `Sponsor`, `sponsor` | Required by validation for revenue rows. |

Business rules for this tab:

- `Cancelled` rows must not affect calculations.
- `Type` determines cash sign and calculation direction.
- `Main Category` drives KPI grouping and support-sheet checks.
- `Work Month`, `Status`, `Main Category`, and `Cost Behavior` should be entered in canonical sheet values even when parser aliases can recover older forms.
- `Original Forecast` is optional and should not block current dashboard use.
- Nonblank invalid `Original Forecast` values trigger an info issue and are ignored for forecast calculations until they are corrected.
- `Running Balance` is not the authoritative month-end truth.

### Monthly Production Summary

Observed contract:

`Work Month, Total Content, Organic Content, Sponsored Content, Sponsor, Total COGS, Cost per Content`

| Field | Required | Accepted parser aliases | Meaning |
| --- | --- | --- | --- |
| `Work Month` | Yes | `Work Month`, `workMonth`, `work month`, `month` | Month key used to match transactions. |
| `Total Content` | Yes | `Total Content`, `totalContent`, `total content` | Total output count for the month. |
| `Organic Content` | Yes | `Organic Content`, `organicContent`, `organic content` | Organic content count. |
| `Sponsored Content` | Yes | `Sponsored Content`, `sponsoredContent`, `sponsored content` | Sponsored content count. |
| `Sponsor` | No | `Sponsor`, `sponsor` | Optional sponsor label for that summary row. |
| `Total COGS` | No | `Total COGS`, `totalCogs`, `total cogs` | Optional total production cost cross-check. |
| `Cost per Content` | No | `Cost per Content`, `costPerContent`, `cost per content` | Optional derived cost metric. |

Business rules for this tab:

- Used only as support data for production metrics and validation.
- `Total COGS` should match actual COGS outflows for the same `Work Month` when usable.
- `Cost per Content` should align with `Total COGS / Total Content` when both are present.

### Sponsor Pipeline

Observed contract:

`Sponsor, Deal Value, Status, Probability, Expected Date, Weighted Value, Note`

| Field | Required | Accepted parser aliases | Meaning |
| --- | --- | --- | --- |
| `Sponsor` | Yes | `Sponsor`, `sponsor` | Sponsor name and primary key. |
| `Deal Value` | No | `Deal Value`, `dealValue`, `deal value` | Potential value of the deal. |
| `Status` | No | `Status`, `status` | Pipeline state text. |
| `Probability` | No | `Probability`, `probability` | Probability percentage. |
| `Expected Date` | No | `Expected Date`, `expectedDate`, `expected date` | Expected timing. |
| `Weighted Value` | No | `Weighted Value`, `weightedValue`, `weighted value` | Optional weighted value. If blank, the parser derives it from `Deal Value * Probability / 100`. |
| `Note` | No | `Note`, `note` | Optional free-form note. |

Business rules for this tab:

- Support data only.
- Do not turn this into a CRM contract.
- Keep the sheet focused on cash/business context.

### Lists

Observed shape:

- Row 1: either `A, B, C, D` or `Revenue, COGS, OpEx, CapEx`.
- Row 2: category labels when using the generic header form.
- Rows below: option values under each column.

Contract rules:

- The parser accepts the generic header form or the category header form.
- Each of the four columns must have at least one option below it.
- This sheet is used for category/list support data only.
- Do not repurpose it into a transactional table.

## Required vs Optional Summary

| Tab | Required fields |
| --- | --- |
| `Transactions` | `Date`, `Work Month`, `Type`, `Main Category`, `Description`, `Amount`, `Status` |
| `Monthly Production Summary` | `Work Month`, `Total Content`, `Organic Content`, `Sponsored Content` |
| `Sponsor Pipeline` | `Sponsor` |
| `Lists` | A valid 4-column header shape and at least one option under each column |

Conditional validation also applies:

- Revenue rows should include `Sponsor`.
- People-cost outflows should include `Person`.
- Outflow rows should include `Cost Behavior` before inference is used.

## Work Month, Date, and Running Balance

- `Work Month` is the monthly business bucket.
- `Date` is the row-level timing and audit field.
- Cash Flow and Scenario logic use `Work Month` as the month basis.
- `Date` must not replace `Work Month` for monthly chart grouping.
- `Running Balance` is recomputed from opening balance plus sorted monthly net.
- Row-level `Running Balance` values are compatibility data, not the source of truth for month-end cash.

## Validation Behavior

The refresh pipeline builds a validation report with three groups:

- `criticalIssues`: issues that should be fixed before trusting cash truth.
- `managementIssues`: issues that should be fixed before relying on secondary metrics.
- `infoIssues`: informational notes and fallback context.

Report flags:

- `criticalReady`
- `managementReady`

Backward compatibility:

- Older snapshots that still contain `renderingWarnings` and `managementWarnings` are normalized into the new groups when they are read.

Current issue codes visible in `lib/transactionModel.ts`:

- `unsupported-date`
- `missing-work-month`
- `invalid-work-month`
- `invalid-amount`

Management-related:

- `invalid-status`
- `invalid-main-category`
- `missing-cost-behavior`
- `invalid-cost-behavior`
- `missing-sponsor`
- `missing-person`
- `missing-production-summary`
- `production-summary-total-cogs-mismatch`
- `production-summary-cost-per-content-mismatch`
- `support-sheet-fetch-failed`
- `support-sheet-invalid-header`
- `support-sheet-empty`

Info-related:

- `invalid-original-forecast`
- `support-sheet-local-fallback`

Validation intent:

- Critical issues should be fixed before trusting the cash snapshot.
- Management issues can still allow the page to render, but the related metric should not be treated as decision-grade.
- Info issues are useful context and should not dominate the screen.
- Support-sheet warnings are confined to the support sheets and do not imply a schema redesign.

## Refresh Behavior

Current refresh behavior from `app/api/refresh/route.ts`:

- Local non-Vercel refresh persists `data/current.json`.
- Local non-Vercel refresh also writes `data/production-summary.json` and `data/sponsor-pipeline.json`.
- Local non-Vercel refresh keeps backups under `data/backups/`.
- If a current snapshot exists locally, refresh copies it into the backup folder before writing the new snapshot.
- Local refresh persistence is isolated in `lib/refreshPersistence.ts` so filesystem behavior stays testable outside the route.
- If an optional support sheet refresh fails, returns an invalid header, or comes back empty, local refresh keeps the last usable local support snapshot instead of overwriting it with empty rows.
- The validation report includes a management warning when that local fallback is used.
- Local refresh writes refreshed JSON through temporary files and only swaps them into place after the fetch and parse step succeeds, so a failed write should leave the previous `data/current.json` readable.
- On Vercel, refresh is stateless.
- On Vercel, the route skips filesystem persistence and returns the refreshed snapshot directly.
- Do not assume durable serverless backups exist.

## Safe-Change Protocol

Before changing any sheet field, alias, or validation rule:

1. Confirm the field belongs to the active contract, not the archived backup tab.
2. Check whether the change can be handled by aliasing instead of schema mutation.
3. Keep parser changes conservative and local.
4. Update validation messages if the operator action changes.
5. Add or update focused tests.
6. Run `npm.cmd run test:finance`.
7. Run `npm.cmd run build`.
8. Verify refresh behavior locally after the change.
9. Update `PROJECT_BRAIN.md`, `IMPLEMENT_PLAN.md`, and this contract doc together when the contract changes.

Maintainer note: keep aliases conservative and prefer documenting the active contract before widening parser inference.

Do not:

- Remove an already-accepted header without a migration path.
- Change the meaning of `Work Month` or `Date`.
- Treat the archived backup tab as active contract data.
- Add a new data store without owner approval.

## Milestone 2 Closure Notes

Milestone 2 is complete because:

- The active field contract is documented for all four live tabs.
- Core-field validation for `Work Month`, `Status`, `Main Category`, `Amount`, `Cost Behavior`, `Sponsor`, `Person`, and `Original Forecast` is explicit in code and covered by focused tests.
- Optional support-sheet refresh fallback is documented and covered by regression tests.
- Refresh persistence behavior is isolated in `lib/refreshPersistence.ts` and covered by tests for both local filesystem mode and Vercel/stateless mode.
- The refresh route still refuses to persist anything when `VERCEL` is set, so serverless refresh does not depend on `data/backups`.

Remaining live deploy verification belongs to deployment/release work rather than the sheet-contract milestone itself.
