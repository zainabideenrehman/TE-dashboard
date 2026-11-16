# Milestone 1 handoff

Completed: 2026-10-28. Local demo milestone complete; no production deployment.

## Delivered

- Next.js App Router pages for Overview, People / Employees, People / Attendance and Data Sources; responsive sidebar, department filtering, month picker and clear synthetic-demo labels.
- Populated demo: six fictional employees, three departments and 90 attendance records across October/September 2026, with October inserted at the top and employee columns reordered.
- Read-only Google Sheets adapter using the official Node client, ADC and the spreadsheets.readonly scope; mocked API-boundary tests. No cloud credentials were requested, stored or used.
- Multi-tab source selection, connection testing, add/remove, rename/category editing, structure inspection/comparison, field mapping, explicit aliases/status rules, preview and publication.
- Server-enforced preview receipts bound to the complete bounded grid, mapping revision, inspection and relevant employee context. Previous revisions and approved inspection are retained.
- Month/header anchor parsing, per-month employee-column detection, source provenance and review warnings for ambiguous names, invalid dates, unknown statuses, malformed headers/sections and duplicate records.
- Request-driven 60-second cache, manual refresh, failed-attempt throttling, source errors and last-good fallback.
- Atomic local JSON registry with serialized process-local updates and separate demo/Google registries; isolated HTTP-test namespaces. Cloud Run explicitly blocked until durable storage and a protected cache exist.
- Localhost binding, loopback-host and same-origin API guards; credential/finance/payroll tabs excluded.
- README and secret-free environment template with setup, service-account sharing, ADC versus key configuration, storage/cache behavior, supported layouts, limits and deployment checklist.

## Verification

| Check | Result |
| --- | --- |
| npm run lint | Passed, no warnings/errors |
| npm run typecheck | Passed |
| npm test | 17/17 passed |
| npm run build | Passed; all four application page routes and dashboard API built |
| npm run test:smoke | Passed against production build on temporary localhost port |
| npm audit --json | Zero reported vulnerabilities |

The HTTP smoke exercised page routes, populated demo data, tab metadata, rejected cross-origin mutation, source removal/addition, inspection, preview, publication, refresh, rename and persisted revision/refresh status. It used a temporary registry and removed that registry after completion.

Google integration was tested using a mocked read-only API. Live Google Sheets credentials, real data and a visual browser interaction test were not used.

## Files added or updated during Milestone 1

There is no Git repository metadata in the starter, so this is the milestone implementation inventory rather than a Git diff. AGENTS.md and CODEX_TASK.md were preserved.

- app/layout.tsx
- app/page.tsx
- app/loading.tsx
- app/error.tsx
- app/globals.css
- app/people/employees/page.tsx
- app/people/attendance/page.tsx
- app/data-sources/page.tsx
- app/api/dashboard/route.ts
- components/dashboard.tsx
- components/ui/button.tsx
- lib/domain.ts
- lib/demo.ts
- lib/parser.ts
- lib/sheets.ts
- lib/service.ts
- lib/store.ts
- lib/utils.ts
- tests/parser.test.ts
- tests/extra-parser.test.ts
- tests/service.test.ts
- tests/workflow.test.ts
- tests/http-smoke.ts
- package.json
- package-lock.json
- tsconfig.json
- next-env.d.ts (Next.js-generated declarations)
- postcss.config.mjs
- eslint.config.mjs
- components.json
- .gitignore
- .env.example
- README.md
- MILESTONE_1.md

Generated .next files, dependencies and gitignored registry/cache files are not application source files.

## Launch

From F:\work\Products\TEDashboard:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. DEMO is the default when DATA_MODE is unset.

Use Node.js 22.13+ (24 LTS recommended). The installed Node 20.9 ran the checks successfully but produced a dependency engine warning.

## Remaining deliberate deferrals

Firestore implementation; shared/multi-instance cache; network deployment and infrastructure access controls; additional source layouts beyond the documented bounded MVP parser; real HR/attendance policy; finance/salary, BD and Development data; Grokbot/Slack/AI integrations; dashboard login. No Sheets writes are implemented.


## Employee completion follow-up — 2026-10-28

The live Employee Details source now publishes 17 additional personal, education and employment profile columns. Click a name or View profile in People / Employees. Cell and rich-text web links are supported; embedded images/drawing objects are not extracted. Bank, finance, salary and credential columns remain excluded.

New employee IDs require user approval. Add the row to the source, then use Data Sources > Review new employees > Preview mapping > Publish mapping > Refresh data. ID proposals remain drafts until publication. Existing IDs are preserved, retired IDs are not reused, duplicate/incomplete names are blocked, and the last-good directory remains available while a new employee is awaiting approval. Employee name changes must retain the prior internal ID through an explicitly reviewed alias.

Live verification: mapping v3, 55 employees, 17 profile fields each, 24 Active and 31 Left, no employee-source errors, and every existing name/ID pair unchanged. The source spreadsheet was only read. Attendance remains unpublished pending its policies and remaining name confirmations.

Checks passed: lint, typecheck, 29 tests, an isolated production build, and the expanded HTTP smoke workflow covering employee profiles and new-employee ID review. The production check used an explicit source-only copy inside .data, copied no credentials, did not stop the user's dev server, and was removed after verification. The running localhost dashboard was separately verified to serve the expanded profiles.

Files added or updated in this follow-up:

- components/dashboard.tsx
- components/employee-profile.tsx (new)
- lib/domain.ts
- lib/employees.ts (new)
- lib/formatting.ts
- lib/parser.ts
- lib/service.ts
- lib/sheets.ts
- tests/employees.test.ts (new)
- tests/workflow.test.ts
- tests/http-smoke.ts
- package.json
- README.md
- MILESTONE_1.md

The gitignored .data/registry-google.json contains the published mapping revision and cached profiles. Temporary mapping drafts remain local configuration artifacts. No key files or source business records were committed.
