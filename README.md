# Finance Dashboard

Internal finance dashboard for Easymoneyconcept / Fin Friend Media.

## Operating model

- Google Sheet is the source of truth.
- `Cash Flow & Running Balance` is the main truth surface.
- `Scenario` is the decision companion.
- Use `Work Month` for monthly cash and scenario views.
- Use `Date` for transaction audit context, not for monthly chart grouping.
- Local backup and restore are for local recovery only.
- Vercel refresh is stateless and must not depend on durable filesystem writes.

## Start here

1. Update the Google Sheet.
2. Refresh the dashboard.
3. Check validation warnings.
4. Read Cash Flow and Scenario before making a decision.

## Common commands

```powershell
npm.cmd install
npm.cmd run dev -- -p 3011
npm.cmd run test:finance
npm.cmd run build
```

## Key docs

- [PROJECT_BRAIN.md](./PROJECT_BRAIN.md) - project scope, guardrails, verified state, and milestone history.
- [IMPLEMENT_PLAN.md](./IMPLEMENT_PLAN.md) - active milestone plan and production readiness path.
- [25042026_implement_plan.md](./Back%20up%20implement%20plan/25042026_implement_plan.md) - archived milestone plan.
- [OPERATOR_MANUAL.md](./OPERATOR_MANUAL.md) - day-to-day refresh, reading, warnings, and recovery steps.
- [GOOGLE_SHEET_CONTRACT.md](./GOOGLE_SHEET_CONTRACT.md) - active sheet tabs, field contract, and refresh notes.
- [package.json](./package.json) - runnable scripts and dependencies.

## Notes

- Do not edit snapshot JSON files by hand.
- Do not treat `data/backups` as durable production storage.
- Keep validation severity grouped as `Critical`, `Management`, and `Info`.
