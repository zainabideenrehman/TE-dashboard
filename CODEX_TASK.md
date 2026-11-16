# Codex — first implementation task

Build a working local MVP of **Agency Command Center** in this folder. Read AGENTS.md first and follow its architectural constraints. Do the work rather than only drafting a plan.

## Milestone 1: App foundation + usable Data Sources module
1. Scaffold Next.js + TypeScript + Tailwind + shadcn/ui, attractive responsive sidebar and pages: Overview, People/Employees, People/Attendance, Data Sources.
2. Add working Data Sources registry: add Sheet URL/ID, choose tabs, rename/category, list/remove sources, persist registry in dev under `.data/`; define store interface for Firestore in production. Never write to Google Sheets.
3. Implement server-side Google Sheets client with read-only scope and Application Default Credentials; separate client adapter so demo mode works without credentials. Add connection test and helpful errors.
4. Build Inspect Structure page with tab metadata + bounded raw-grid preview + detected headers/month sections; display a diff from the last approved inspection. Never guess silently. Store structure inspection snapshots. Add an explicit approval/save action for mappings; mapping form can start with basic employee field mapping.
5. Build Refresh Data action with status, errors, 60s server cache and last-good result. Do not assume cron jobs or always-running processes on serverless hosting.
6. Provide clear demo mode with synthetic employees and attendance sheets including monthly sections inserted at the top and reordered employee columns. Label all sample data as demo data.
7. Implement employee directory driven by normalized demo data and filtered by department, and initial attendance calendar driven by synthetic data. It must be ready to connect real sheets later.
8. Implement tests showing that moving a month section down and changing employee columns does not break records if headers are recognizable. Flag ambiguous employee matches.
9. Include README/.env.example and executable setup instructions. Run lint/typecheck/tests, fix errors, and report exact local startup command.

## Definition of done
- `npm install` and `npm run dev` lead to a usable local demo.
- Admin can add a source, inspect structure, change and publish a mapping, refresh data, and see statuses.
- Employees and Attendance pages display demo records end-to-end.
- If Google Cloud isn't configured, the dashboard still runs in clearly labeled demo mode; connecting a real shared sheet works once credentials are set.
- The Google Sheets API is never used for writes; browser never receives cloud credentials.

## Deliberate deferrals
- No real HR/attendance calculations until actual attendance status rules and sheet layouts are reviewed.
- No salary/finance/BD integration, Slack/Grokbot automation, GitHub delivery auditing, general user login, production deployment, or automatic multi-instance cache yet.
