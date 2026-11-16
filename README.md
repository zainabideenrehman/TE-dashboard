# Agency Command Center

A read-only agency operations dashboard built with Next.js App Router, TypeScript, Tailwind CSS and a shadcn-style Radix button. The local demo needs no Google account, credentials, production sheet exports, AI service or database.

codex --sandbox workspace-write --ask-for-approval on-request

## Launch locally (PowerShell)

Use Node.js 22.13 or newer (Node 24 LTS recommended) and npm. The app was also verified on the existing Node 20.9 installation, which produces an engine warning for a lint dependency.

```powershell
cd F:\work\Products\TEDashboard
npm install
Copy-Item .env.example .env.local
npm run dev
```

If you already have an .env.local file, edit it instead of overwriting it. Open **http://127.0.0.1:3000**. Both dev and production start scripts bind to localhost. API routes also reject non-loopback Host headers; network deployment requires a reviewed trusted-origin configuration alongside infrastructure access controls.

The default DEMO mode immediately displays six fictional employees in three departments and 90 synthetic attendance records in September/October 2026. October is inserted above September and reorders the employee columns. The demo's approved sample mapping defines P = Present, A = Absent, L = Leave; these are examples, not real attendance policy. Missing records display a dash and do not imply absence.

Navigation: Overview, People / Employees, People / Attendance, Data Sources. Finance, BD and Development are placeholders. The attendance month picker initially selects the newest available month.

## Data Sources walkthrough

1. Open Data Sources. In demo mode use spreadsheet ID `synthetic-agency-demo`.
2. **Test connection & load tabs** reads metadata. Select one or more tabs and choose Employees or Attendance. Tabs already registered cannot be added twice; remove a demo source first if you want to exercise adding it again.
3. **Inspect Structure** reads metadata and bounded values. It shows the latest detected headers, month anchors, section boundaries, confidence/review warnings and raw preview. **Compare Structure** shows the diff and the previous approved baseline. These actions never write to Sheets.
4. **Configure Mapping** lets you edit source name/category and basic field names. The JSON editor also configures explicit aliases and status mappings. After changing field names, use **Inspect with draft mapping**.
5. **Preview mapping** parses current values without changing the published mapping. Resolve all warnings, then **Publish mapping**. The server requires a matching preview and checks all bounded values, the current mapping revision, inspection and employee identity context again before approval. The previous revision is retained.
6. **Refresh data** fetches values using the published mapping and replaces cached records only if parsing succeeds. Refresh employee sources before attendance sources. Reloading the dashboard automatically revalidates published sources when their 60-second TTL expires.

A failed inspection retains the previous inspection, approved mapping and last-good records. Failed refreshes display an error with the last successful refresh timestamp and keep last-good records. Failed attempts are throttled for 60 seconds; manual refresh bypasses the TTL. Category changes clear that source's current records and require fresh inspection and approval.

Inspection detects structure with deterministic rules, not AI. Each monthly attendance section finds its own Date header and employee columns. Historical months are not addressed by absolute row numbers. Duplicate anchors, missing headers, invalid dates, unlabeled values, duplicate records, unknown statuses and ambiguous identities require review.

## Supported MVP layouts

**Employees:** one header row with configurable field names; rows below it contain employee records. The name column is required. Email, department and employment status may be absent (department becomes Unassigned and employment status Unknown). Employee IDs must be unique across sources.

If a sheet has no ID column, leave the ID mapping blank and explicitly map each exact employee name to an internal ID using `aliases`, for example:

```json
{
  "id": "",
  "name": "Full Name",
  "department": "Department",
  "email": "",
  "status": "",
  "aliases": { "Alex Smith": "EMP-100" },
  "statuses": {}
}
```

Two employees with the same name cannot be distinguished through a single name alias; add stable IDs to the source layout. The app never generates identities from names.

**Attendance:** an optional English month/year heading such as October 2026; then Date in the first column, followed by employee IDs or recognizable names in subsequent columns. Dates must be ISO YYYY-MM-DD. Repeat the header independently for each month. Employee columns may move, be added, or vary between months. Explicit header aliases resolve names to stable IDs. Unknown or ambiguous matches block publication/refresh. Exact employee IDs take precedence over name matches.

Status mappings are explicit case-sensitive source-token-to-display-status dictionaries. Newly added Google sources start with **no attendance status rules**. Supply reviewed rules before publishing. Formulas are read as their formatted results; locale-specific dates, merged employee headers, transposed layouts and non-English month headings need a new deterministic parser adapter.

## Connect real Google Sheets

1. Enable the Google Sheets API in your Google Cloud project.
2. Create/reuse a dedicated service account. Share each operational spreadsheet to its email as **Viewer**.
3. Set `DATA_MODE=GOOGLE` and optionally `GOOGLE_CLOUD_PROJECT_ID` in .env.local. Restart the server. Google mode has its own empty registry; it does not inherit demo records.
4. For local service-account key authentication, save the service account's downloaded JSON key **outside this repository**, for example C:/secure/agency-reader.json. Add its absolute path to .env.local:

   ```dotenv
   DATA_MODE=GOOGLE
   CONFIG_STORAGE=local
   GOOGLE_APPLICATION_CREDENTIALS=C:/secure/agency-reader.json
   ```

   Use your actual key-file path. Forward slashes work on Windows. Keep the existing GOOGLE_CLOUD_PROJECT_ID setting if configured. Restart with npm run dev after changing the environment. The server reads the key automatically; no gcloud installation, interactive login or impersonation setup is required for this method. Do not paste the key contents into .env.local or the dashboard, and never commit the JSON key.

   ADC remains an alternative: omit GOOGLE_APPLICATION_CREDENTIALS and configure local ADC, or use an assigned service account on Cloud Run. A plain user ADC login uses your developer identity rather than the service account and requires the correct Sheets scope. Production Cloud Run must use its assigned identity rather than a deployed key file.

5. Add the Sheet URL/ID, load tabs, inspect, map, preview, publish and refresh.

The backend uses the official googleapis client and requests only
`https://www.googleapis.com/auth/spreadsheets.readonly`. Only read requests for tab metadata, bounded values, and approved employee-name formatting are implemented. There is no Sheets write API, browser credential delivery or dashboard Google OAuth.

Credential/password/secret and salary/payroll/finance tabs are excluded from selection and value reads. Metadata requests retrieve only tab properties. Connect operational spreadsheets only; the app cannot determine sensitive content from an innocuous tab name.

The Google adapter uses a 15-second request timeout and conservatively refuses tabs whose allocated grid exceeds **3,000 rows or 52 columns**, so reads cannot silently truncate older months. Inspection's visual sample is at most 40 rows by 20 columns. Use an appropriately sized operational tab for MVP; increasing the bounds or supporting larger sources needs a reviewed paging strategy.

Connection failures explain ADC, Viewer sharing/API enablement, missing tabs and quota errors. No production credentials were used during verification.

## Storage and cache

`RegistryStore` in lib/store.ts defines the persistence boundary. Development uses atomic JSON replacement under the gitignored .data folder, with in-process serialized updates:

- .data/registry-demo.json
- .data/registry-google.json

It stores local configuration, previous mapping revisions, bounded inspection snapshots and a last-good parsed cache. Sheets remain the business-record source of truth; edits to the app never update Sheets. An older starter .data/registry.json is left untouched and is not automatically migrated.

The 60-second cache is request-driven; there is no cron or always-running background process. The local lock is per process. Concurrent independent app processes and production shared/multi-instance caching are not supported. `REGISTRY_NAMESPACE` optionally isolates development/test registries within .data; the HTTP smoke test uses a temporary namespace.

**Local disk is not safe persistence on Cloud Run.** The app refuses to use this adapter when K_SERVICE is set. A Firestore implementation is deferred: implement RegistryStore transactions for metadata/configuration only, and separate raw inspection samples and parsed business records into an appropriately protected cache. Do not store business records in the production metadata registry.

## Checks and production build

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:smoke
npm audit
npm start
```

Parser tests cover month insertion/movement and reordered employee columns, explicit aliases, ambiguity, malformed sections and unmapped statuses. Integration tests use a mocked read-only Google API, mocked outages, and an isolated local JSON store. They exercise approval enforcement, stale previews beyond the sample, revision retention, TTL/manual refresh, inspection failure, last-good fallback and persistence. The HTTP smoke test starts the built app on a temporary localhost port, exercises the real routes and source workflow in demo mode, and removes only its temporary registry.

## Deployment checklist and deliberate limitations

Before exposing any employee data or management endpoint:

- Implement and test a durable metadata-only Firestore RegistryStore adapter and protected data cache. Local Cloud Run disk cannot be used.
- Attach the dedicated service account as the Cloud Run service identity; do not deploy a credential key or set GOOGLE_APPLICATION_CREDENTIALS on Cloud Run.
- Enforce access through private ingress, IAP/private proxy or equivalent network/infrastructure controls. The app has no login; a service account authenticates Sheets access, not dashboard visitors. Same-origin mutation checks do not replace access control.
- Enforce the read-only Sheets scope and Viewer sharing. Keep credentials, salary and finance sources excluded.
- Define retention/access rules for inspection snapshots and cache records; review backup and source-removal handling.
- Review actual attendance layouts and status policies, then validate parsers against representative non-sensitive fixtures.
- Add shared cache/concurrency controls before running multiple instances; re-review framework dependencies and deployment configuration.

No deployment is performed by this milestone. Salary/finance, BD, Development integration, Grokbot, Slack, AI/LLM calls, dashboard OAuth/login, multi-instance cache and real HR policy calculations are deliberately deferred.

Google setup references: [local ADC and impersonation](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment), [Sheets read-only scope](https://developers.google.com/workspace/sheets/api/scopes).

## Employee names marked as left

For the Employee Details source, the user-approved rule is: a fully struck-through employee name means the employee has Left. Enable **Struck-through employee names mean Left** in its mapping, inspect with the draft, preview, and publish. This is opt-in per source through nameStrikethroughMeansLeft; it is not an attendance rule and is off by default for other sources.

The server reads effective formatting and rich-text runs only from the mapped name column, within the same bounded read-only Sheets scope. A fully struck-through name overrides the employment-status column to Left. Unstruck names retain the source's explicit employment status. Partial strikethrough, mismatched name/format snapshots and unavailable formatting require review or preserve last-good records. Preview approvals include formatting, so a formatting-only change invalidates a pending preview.

Former employees retain their stable IDs and attendance history. The employee directory displays Left clearly and can be filtered by employment status; the overview separately reports the number of Left employees. Moving rows does not change the rule or employee IDs. See Google's [cell formatting and rich-text API documentation](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/cells).

## Employee profiles and adding new employees

In People / Employees, click an employee name or **View profile** to see additional mapped personal, education and employment details. The Employee Details mapping includes 17 extra source columns: father name, contact number, degree subject, graduation year, university, CGPA, CNIC, designation, birth/joining/exit dates, permanent/current addresses, picture, performance, CV and the source's tenure value. Bank, salary, finance and credential fields remain excluded. Data stays read-only; blank source cells display a dash.

Web links exposed by Sheets as plain values, cell hyperlinks or rich-text links are clickable in the profile. Embedded pictures or Office drawing objects are not extracted by this MVP. No external image is fetched automatically just by opening the employee directory.

New employee IDs require approval:

1. Add the new employee row to the existing employee sheet with a unique full name and its normal details. No internal-ID column needs to be added to the sheet.
2. In Data Sources, choose **Review new employees** for the employee source. The app proposes stable IDs, preserves existing IDs and retired aliases, and blocks duplicate or incomplete names. This prepares a draft only.
3. Review the proposed names/IDs, click **Preview mapping**, then **Publish mapping** to approve. Refresh data if needed; the directory also refreshes published sources on its next request.
4. Future value changes use the approved mapping and ordinary refresh. New unmapped names retain the last-good directory until their IDs are approved. Renaming an existing employee requires mapping the new name to the existing ID; it must not be approved as a second person accidentally.

Additional profile columns are configured by profileFields in the published mapping. Changing or removing mapped headers requires inspection and mapping review. These settings use the same explicit preview/publication checks as the other mappings.
# Attendance text mapping

The attendance page shows active employees, daily source text/times/notes, pending blank markings and annual leave balances. Text attendance mappings configure `attendance: { mode: "text", firstRow: 28, allowances: { "stable-employee-id": { year: 2026, days: 15 } } }`. Allowances are reviewed configuration, not automatically inferred from joining dates. Current reviewed usage is LEAVE + ABSENT + 0.5 × HALF DAY/HALFDAY. Colours and arrival thresholds do not determine classifications.

Attendance reads start at the configured first row; skipped rows are padded only in memory to retain original cell coordinates. Each month discovers its own Date header and employee columns. Unmatched names appear as explicit review items and do not prevent confirmed employees from displaying. Unmatched employees show incomplete coverage rather than zero usage. Structural failures retain last-good data. Publish mappings through inspect, preview and publish before refreshing.

After changing source code, restart any running production server to load the new build, or stop it and run `npm run dev` for local development. An already running production server continues executing its previous compiled parser.



### Attendance calendar (2026-10-30)

People / Attendance has Month and Week views, individual employee/department filters, category colours, and day details. Pending is hidden by default; use the category selector to review genuine elapsed blank source cells. Future and known pre-joining blanks are excluded from Pending counts. Missing records remain missing. Times and notes are shown as written, with no inferred lateness or approval.

Leave cards and the per-employee table show leave taken, half days, absence deductions, allowances and remaining balances through today in Asia/Karachi. Coverage and blank counts are expandable. Recorded public holidays are separate, source-only dates. Balances reflect available source coverage.

`npm start` serves the last production build; editing source does not update it. Stop that process and run `npm run dev` for current source, or rebuild before using `npm start`. Do not build over a running production server's `.next` directory.


Attendance display clarification (2026-10-30): Saturday/Sunday blank cells display as Weekend for all employees. Shared bank-holiday labels recorded for Javed apply to other existing blank employee records on that date, independent of employee filtering. Explicit attendance markings and pre-joining dates take precedence. Source records remain unchanged. Clock entries after 09:30 display orange as Late; after 10:00 display red as Severely late, with the original time retained. These user-approved display rules supersede the earlier explicit-text-only time rule. Approval is still never inferred from source colours.


### Share the local app for HR review

A temporary Cloudflare Quick Tunnel can share the app while it stays on this computer. Authentication happens at Cloudflare's edge with an email one-time PIN; this is not a Google Sheets login or application OAuth integration. Only the exact emails in gitignored `.data/hr-review-config.json` are allowed. Cloudflare Quick Tunnels are temporary development/review endpoints, not production hosting.

Prerequisites: dashboard running on `127.0.0.1:3000`; official Cloudflare Windows executable at `.data/tools/cloudflared.exe` with `--allowed-mail` support (verified with 2026.10.6); private config `{"allowedEmails":["hr@example.com","owner@example.com"]}`. Do not run an unprotected tunnel directly to port 3000.

In a separate terminal, run `npm run share:hr`. It starts a loopback-only review gateway on port 3100 and an email-restricted Cloudflare tunnel to that gateway. Share the printed HTTPS URL plus `/people/attendance`. Keep the computer awake, internet connected, dashboard running, and sharing process running. Visitors enter an allowed email and its verification code. The temporary URL changes when sharing restarts. Press Ctrl+C in the sharing terminal to stop the tunnel and gateway; the dashboard stays running. Current session URL/process IDs are in gitignored `.data/hr-review-session.json`.

The review gateway serves Overview, Employees, Attendance and static assets. It rejects all write methods, Data Sources, unknown API routes and debugger/websocket routes. The dashboard API response excludes source mappings/aliases, inspections and revision history while retaining allowances, normalized business records, timestamps and cell provenance needed for review. The app hides Data Sources when the gateway marks the response as review-only. This presentation is backed by the gateway's route/method enforcement. Local administrator access on port 3000 is unchanged; no service-account key is shared. Cloudflare email authentication must remain enabled for the entire tunnel.

Verification includes gateway integration tests for blocked writes/paths, sanitized payloads, preserved attendance data, and stripped forwarded authentication headers. Public unauthenticated access must redirect to the Cloudflare login gate rather than return app data. Interactive email/PIN login should be checked by the intended reviewer; automated verification does not send login emails.


HR tunnel login troubleshooting: an expired broker assertion can produce Forbidden before a request reaches the local gateway; refreshing that POST-only login callback produces Bad Request. Start again from the original review URL in a fresh/private window and request a fresh email code. Check the host computer's clock against a reliable time source: the local tunnel validates short-lived authentication tokens. Do not weaken email authentication or permit callback routes through the app gateway to work around this. Windows Time may need administrator approval to enable/synchronize; NTP can be unavailable on the local network.
# Upwork bidder reporting

Numeric display preference: missing numeric values and unavailable rates display as `0` / `0%` throughout the Upwork views. Internal missing values, evidence/coverage counts and unscored classification are preserved; missing inputs are not inserted into averages. Standalone month/year dividers such as `Nov 26` in Jobs/ Proposal Links are excluded from application records and totals, and reset the inherited date anchor for the next month. Actual job rows with application evidence are retained even if their title resembles a month label.

The Upwork page also has **Keyword Search** and **Relevant Jobs** views. Each is registered independently as an Upwork BD source using the matching draft layout in Data Sources, then inspected, previewed, published and refreshed. Keyword Search shows enabled/disabled settings, search context, vertical, priority, latest run status/errors and latest recorded counters. Relevant Jobs shows the discovery pipeline, keyword matches, recorded fit scores, decisions, application flags and operational details. Filters and source-row details are available in both views. Exact Upwork job URL identifiers match discovered jobs to the existing application log; titles do not establish identity and pipeline records do not inflate application totals.

Keyword last-run counters are not daily totals or a historical run log, and multiple keywords can discover the same job. Blank scores/counters/outcomes remain unknown; scores are displayed from the sheet without automated rescoring or bid decisions. Source timestamps are displayed as recorded in record details. Connection references are excluded; the requested job budget and client commercial metadata are allowed, with no employee salary or finance sources. Reads are bounded to A:S for Keyword Search and A:BG for Relevant Jobs. Explicit Block Date/Block Shift headings carry down to subsequent jobs with anchor-row provenance; overnight labels remain intact. Block and Soft Hold filters preserve the recorded classifications. Essential header changes/duplicate IDs fail safely and preserve last-good data; missing optional headers remain blank. Header-only sources can be empty. No search execution, scraping, bidding, source writes or changes to enabled settings are performed.

The default **Discovery analytics** view provides Daily pulse, Weekly / WoW, Keyword lab, Soft Hold monitor, Apply outcomes, Progression, and Quality / ops using connected records only. Select a 7/14/30-day window and end date. Discovered At drives discovery calendars in PKT; Block Date is not a substitute. ISO timestamps with an offset are converted to PKT; ISO timestamps without a zone are interpreted as PKT. Invalid/ambiguous dates are excluded and counted in operational health. Weeks start Monday. This week is partial, while last week is complete. Empty calendar periods mean no recorded rows.

Live discovery timestamps also accept the sheet's explicit `M/D/YYYY h:mm[:ss] AM/PM PKT` format (for example `11/3/2026 12:19 PM PKT`). The PKT suffix and US calendar order are required for this numeric timestamp format; unlabelled numeric dates are not guessed.

Application matching prefers Job ID (including the numeric ID extracted from an Upwork job URL), then normalized job URL. Dated application volume counts Applied Jobs rows plus unmatched Relevant jobs marked Applied with a valid Applied At. An undated positive mark contributes to discovery-cohort conversion, never to a daily count. Conversion divides matched/marked positives by the discovery cohort; missing application evidence stays unknown, and a cohort with no evidence has no conversion rate. Multiple applications to one job remain application rows but count that discovered job once for conversion. Source/keyword attribution can overlap. Notification shares refer to selected discovery cohorts. Scores, score bands and component/outcome averages use recorded values only; no qualifying decisions are inferred. Budget bands separate currencies and job types. Bid averages accept only plain numeric values and display recorded units; inspect source details before interpreting mixed monetary units. Draft/submitted proposal comparison remains a hook until source columns exist.

For local production mode, run `npm run build` in this repository and then `npm run start`. Start requires a completed `.next/BUILD_ID` here; a build in an isolated verification folder does not prepare the main project. For development, use `npm run dev`.

Open `/bd/upwork` locally for the applied-job log, job links and source-row details; bidder/profile filters; daily, Monday-based weekly and monthly activity; period changes; recorded views, replies, interviews and hires; separate Connects and Boosted Connects; and targeting comparisons by search term, location, competition, expertise and proposal assets. All dates are shown by default. The visible Upwork page checks for updates every 60 seconds using the existing server cache. Opening the page also refreshes expired data. No unattended schedule or external report delivery is configured.

Applied Jobs uses recognizable headings and date anchors rather than fixed data rows, including the leading-space `  Applied Date` header. The user confirmed 2026 for dates without a year. Ambiguous numeric dates remain unresolved and are available with date filters cleared. The client-side Hired column is distinct from the agency outcome Hired column beside Call/Result. Operational reads are bounded to A:AU, including Claude Link and excluding the ambiguous trailing Profile/Expertise duplicates. Mapping changes require inspection, preview and local publication. Source spreadsheets remain read-only.

Missing bidder, connects and outcome markings remain unknown. Rates represent recorded positive outcomes divided by all selected opportunities, including invitations unless filtered to Proposal. They are incomplete when outcomes are missing. Empty periods mean no logged rows, not independently verified inactivity. Partial periods are labelled. Historical cohorts show current outcomes; there is no historical outcome snapshot or reconstructed transition date. No monetary/ROI calculations are included. The HR review tunnel excludes Upwork data and routes.

# Vercel live deployment

The hosted deployment reads live Google Sheets using server-only `GOOGLE_SERVICE_ACCOUNT_JSON` credentials and the existing read-only Sheets scope. Never upload `key/`, `.env.local`, or `.data/` as source. `.vercelignore` excludes these even for CLI uploads. Require Vercel Authentication with protection set to **all deployments**, including production domains, before setting credentials.

Set `DATA_MODE=GOOGLE`, `DASHBOARD_ORIGIN` to the exact HTTPS production origin, and `SOURCE_REGISTRY_JSON` to a registry containing only approved source IDs, spreadsheet/tab IDs, display names, parser, mapping versions, mappings and empty revision arrays. Store the credential and registry variables as sensitive environment values. Do not include parsed records, inspection previews, timestamps or error snapshots. Configuration is durable as a deployment environment snapshot; the hosted source-management page permits refresh only. Review and preview mapping changes locally, publish there, then replace the hosted registry variable and redeploy. The local mapping revision history remains local.

Hosted parsed records and last-good data live only in process memory, with the existing 60-second TTL and serialized updates. A cold start or new instance reads Sheets again; if Sheets is unavailable then, that instance cannot recover the previous instance's last-good data. No shared or persistent business-data cache is provided. Firestore-backed editable metadata and a protected shared cache remain future work. Each configured source is read only from its approved operational tab; credential, salary and finance tabs remain excluded. Alternate deployment hosts are intentionally rejected by the API until the configured origin is changed.

