# OPERATOR_MANUAL.md

Daily operator manual for `Finance_Dashboard`.

## Quick Start

1. Update the Google Sheet.
2. Refresh the dashboard.
3. Check validation warnings.
4. Read Cash Flow and Scenario.

Use the sheet as the source of truth. Do not edit snapshot JSON files by hand.

## Doc Map

- `README.md`: repo entry point and short operating model summary.
- `PROJECT_BRAIN.md`: scope, guardrails, verified state, and next safe action.
- `GOOGLE_SHEET_CONTRACT.md`: active sheet fields, validation rules, and refresh behavior.
- `IMPLEMENT_PLAN.md`: milestone status, release criteria, and closeout notes.
- Keep these docs aligned whenever sheet meaning, warnings, or recovery steps change.

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
On the live deployment, refresh the sheet first and then verify the deployed dashboard after the redeploy finishes.

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

## Cash Runway Note

The cash summary now shows one extra timing note beside `Cash Runway`.

- `Cash Runway` still shows the monthly burn-based runway in months.
- The added note is approximate and based on the `Base` forecast path.
- The added note updates from the current local day, so the day count stays current after midnight without needing a manual refresh.
- It is a timing signal only, not a day-level forecast model.
- If the `Base` forecast never goes below zero, the note says so instead of inventing a zero date.

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

Warnings are grouped as `Critical`, `Management`, and `Info`.

- `Critical` means the data should not be used for management decisions yet.
- `Management` means the page can still load, but the number needs cleanup before relying on it.
- `Info` is informational and does not block the page.

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
2. Check the live deployment after Vercel finishes.
3. Open the dashboard and check validation warnings.
4. Confirm Cash Flow and Scenario still make sense for the latest month.
5. Run `npm.cmd run test:finance`.
6. Run `npm.cmd run build`.
7. Run `git diff --check`.
8. Run `git status --short --branch`.

If any check fails, fix that first. Do not ship a snapshot that you cannot explain.

## Recovery

- `GET /api/backups` lists local backup files under `data/backups`.
- `POST /api/restore` restores one named local backup and saves the current snapshot first when one exists.
- Use restore only for local recovery. `data/backups` is not durable production storage.
- After a restore, open the dashboard and re-check validation before trusting the numbers. Older backups may restore successfully but still contain management issues.
- Do not delete backups or snapshots unless the owner explicitly asks.
- Maintainer note: keep `Work Month` as the monthly basis, keep `Date` as audit timing, and update the contract and project brain before handing off any change to sheet meaning or validation.
