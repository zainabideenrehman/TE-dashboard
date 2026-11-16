# Agency Command Center — Codex project instructions

## Goal
Create an extensible, read-only agency operations dashboard that reads existing Google Sheets with a Google Cloud service account. Staff keep using their Sheets; the app never writes to source spreadsheets. Normal operation makes no AI calls. An admin can add sources and inspect or revise mappings from the dashboard.

## Boundaries
- Work only inside this repository, and show changed files and test results at the end of each milestone.
- Don't ask for production sheet exports or credentials to start. Make a realistic, clearly labeled synthetic demo dataset and build a fully functional local demo first.
- Google Sheets API calls are server-side using Application Default Credentials or Cloud Run's assigned service account. Scope must be `https://www.googleapis.com/auth/spreadsheets.readonly`. Never expose credentials to the browser or commit keys/secrets.
- No dashboard Google OAuth/login. During development, bind to localhost. Before exposing this app on a network, enforce access at the network/infrastructure layer. Do not publicly expose employee or finance data or sheet-management endpoints.
- Never access credential sheets. Leave salary and finance out of MVP.
- No Grokbot integration for now; it will update the source Sheets externally later.

## Chosen stack
- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, server route handlers.
- Google Sheets API via official Google client, Node runtime only.
- Source-registry persistence behind an interface: development implementation persists config in a local JSON file under `.data/`, which is gitignored; production interface should support Google Cloud Firestore (metadata/config only). Business records remain in Sheets. Make clear that local disk persistence is not safe on Cloud Run.
- Server-side data parsing, normalization and cache with 60-second TTL, manual refresh and stale-last-good fallback. Production multi-instance/shared cache is a later task. Include last-refreshed timestamps and source error indicators.
- Use stable internal IDs to link employees to departments and attendance. Support manual employee alias matching for sheets without IDs. Never silently merge ambiguous names.

## Domain structure
- Navigation is organized by function: Overview, People (Employees, Attendance), Data Sources. Finance, BD, Development are future placeholders, not separate data stores.
- Employee: employeeId, name, optional email, departmentId, optional teamId, employmentStatus, source references.
- AttendanceRecord: employeeId, ISO date, normalized status, source spreadsheetId/tab/row/column. Status mappings configurable; do not invent attendance rules.
- Source registry: sourceId, spreadsheetId, selected tabId/name, dataType, displayName, parser type, mapping version, last inspection, last refresh, status.

## Source management UX
- Add a source by pasting Google Sheet URL or spreadsheet ID; let admin load tabs from Google Sheets metadata and select one or several.
- List sources with actions: Inspect Structure, Compare Structure, Configure Mapping, Refresh Data.
- Structure inspection reads relevant sheet metadata and sampled grid/values, then detects headings, month/year anchors, potential employee header rows, boundaries and structural differences using deterministic rules. It should show original vs newly detected structure and mark low-confidence/ambiguous regions for review.
- Configuration changes must be explicitly previewed and saved/published; keep the previous mapping revision and last-good parsed data if inspection fails.
- Adding a new month at the top changes row positions. NEVER rely on absolute row coordinates for historical months. Use anchor/heading detection plus approved rules. Allow month-specific header or employee-column variation. A 'new month added' must not silently damage older months.
- Difference between actions: Inspect reads and analyzes sheet structure; Refresh Data fetches/normalizes current values using published mapping. Both are read-only against Google Sheets.

## Implementation quality
- No daily AI calls or LLM dependencies.
- Validation, loading/empty/error states, deterministic parser tests and integration boundaries with mocked API clients.
- Provide README: local setup, Google Cloud service account sharing, GOOGLE_APPLICATION_CREDENTIALS vs ADC for local dev, production Cloud Run identity, source registry storage, limitations and deployment checklist.
- .env.example must contain no secrets.
- Before milestone complete run lint, typecheck, tests and fix failures.
