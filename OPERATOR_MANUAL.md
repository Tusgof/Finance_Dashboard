# OPERATOR_MANUAL.md

Daily operator manual for `Finance_Dashboard`.

## Quick Start

1. Update the Google Sheet.
2. Refresh the dashboard.
3. Check validation warnings.
4. Read Cash Flow and Scenario.

Use the sheet as the source of truth. Do not edit snapshot JSON files by hand.

## Key Google Sheet Fields

Fill these fields consistently. They matter most for refresh, charting, and warnings.

| Field | How to fill it |
| --- | --- |
| `Date` | Actual transaction date for audit. |
| `Due Date` | Due date for payment or receipt, if needed. |
| `Work Month` | The month the row should count in reports. Use `YYYY-MM`, for example `2026-04`. |
| `Status` | Use `Actual`, `Committed`, `Forecast`, or `Cancelled`. |
| `Main Category` | Use `Revenue`, `COGS`, `OpEx`, or `CapEx`. |
| `Amount` | Enter a positive number for the row value. Inflow / outflow direction comes from the row type, not from a negative sign. |
| `Cost Behavior` | Fill this on outflow rows and keep the wording consistent with team usage. |
| `Sponsor` | Enter the sponsor or source name for revenue rows. Important for revenue view and sponsor pipeline. |
| `Person` | Enter the person name for staff cost or payroll-related rows. |
| `Original Forecast` | Keep the original forecast when a row becomes `Actual` if you want forecast accuracy and variance. |

Useful supporting fields:

- `Description`
- `Sub Category`
- `Note`
- `Entity`

Add these when they help you trace the row later.

## How To Refresh

After sheet edits:

1. Refresh from the dashboard UI.
2. Wait for the refresh to finish.
3. Check that validation warnings are not blocking.
4. Confirm the new snapshot reflects the sheet change.

Local refresh uses the app endpoint `POST /api/refresh`. Do not rely on manual JSON edits for normal operation.

## How To Read Cash Flow

`Cash Flow & Running Balance` is a monthly view.

- It groups by `Work Month`, not by raw row order.
- It starts from opening cash and adds monthly net movement.
- `Cancelled` rows are ignored.
- The line shows month-end balance by month.

How to interpret it:

- Positive monthly net means cash increased that month.
- Negative monthly net means cash decreased that month.
- If the balance drops below zero, it is a real cash warning for the operating model.

## How To Read Scenario

`Scenario` uses the latest actual month as the anchor.

- `Base` = current forecast path.
- `Bull` = base plus `THB 30,000` per month starting 2 months after the latest actual month.
- `Bear` = all future non-ad customer revenue inflows move by 1 month; ad revenue stays on schedule.
- `Actual History` stays visible so you can compare forecast to reality.

Use Scenario to answer:

- When does cash go negative?
- How much cushion do we have under the current path?
- What happens if revenue slips or new business arrives?

## Work Month vs Date

Use this rule:

- `Date` = when the transaction happened.
- `Work Month` = which month the dashboard should count it in.

For the charts and scenario, `Work Month` is the monthly basis. If these two fields disagree, the dashboard will follow `Work Month`.

## Validation Warnings

Warnings are split into two kinds:

- Rendering warnings: the dashboard can still show data, but the record needs cleanup.
- Management warnings: the data may render, but the number should not be trusted for decision making yet.

Common fixes:

- Missing or unnormalized `Work Month` -> fill `YYYY-MM`.
- Unsupported `Date` or `Due Date` -> use a supported date format.
- Invalid `Status` -> use only the allowed values.
- Invalid `Main Category` -> use only the allowed values.
- Missing `Cost Behavior` on outflow rows -> fill it before relying on the result.

Treat warnings as sheet cleanup tasks, not dashboard bugs.

## Release / Verification Checklist

Before handing off a change or refreshing production data:

1. Refresh the Google Sheet data.
2. Open the dashboard and check validation warnings.
3. Confirm Cash Flow and Scenario still make sense for the latest month.
4. Run `npm.cmd run test:finance`.
5. Run `npm.cmd run build`.
6. Run `git diff --check`.
7. Run `git status --short --branch`.

If any check fails, fix that first. Do not ship a snapshot that you cannot explain.
