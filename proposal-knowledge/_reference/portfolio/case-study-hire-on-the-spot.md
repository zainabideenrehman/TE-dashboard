# Hire On The Spot (HOTS)

**Client:** Hire On The Spot
**URL:** hireonthespot.com
**Industry:** Recruitment, job marketplace, same-day hiring
**Type:** Inherited broken platform, remediated and launched in 4 weeks, ongoing growth retainer
**Timeline:** Kickoff Sept 14, 2026 to public launch Oct 12, 2026. Engagement still running.
**Stack note:** WordPress / WooCommerce, not the default stack. See "Stack" below before anchoring.

## The problem

A previous developer left the platform half-finished and walked. The client had a launch date, an independent audit listing dozens of issues, and no team. They needed someone to fix it, ship it, and then run it.

What we inherited:

- **Unusably slow.** Home page 32.3s. Job search 22.4s. Keyword search 30.3s. The job feed had not imported a single new job in weeks, and 18,470 stale listings were sitting in the database.
- **Payments that didn't work.** Subscriptions were half-configured. Plans showed wrong prices. A Stripe review turned up orders that had been given paid access without ever paying.
- **Security holes.** Scheduled malware tasks still running on the old server. Login pages exposing usernames publicly with no attempt limiting. A permissions hole in team management that let one employer touch another company's users. All custom code lived only on the live server, with no version history and no rollback.
- **Scattered customer comms.** Emails going out late, some with blank subject lines, many sent from the website instead of the client's CRM where the client wanted every message to live.
- **Split infrastructure.** The .ai and .com domains on separate legacy hosts, unknown mailboxes, no email authentication.

The client set a firm cadence up front: something shippable every Friday so their team could review over the weekend.

## How we ran it

Weekly sprints. Each week closed with a written client report and a Loom walkthrough, every task tracked in one shared issue tracker. A lead engineer built, and a separate QA and project lead tested each release independently before it reached the client.

Three ground rules, set day one, for changing a fragile live platform safely:

- **The client owns the code.** We created a private GitHub org in the client's name and diffed all 138 live code files against the repo before trusting it. Every change after that went through version control.
- **Back up first, verify both sides.** Every risky change opened with a full backup and closed with documented checks. The hosting migration ran 23 pre- and post-migration checks with zero differences.
- **Test data never leaks.** Every test record carried a ZZTEST- prefix so it could never surface in public search, and all of it was purged before launch.

## What we built

**Hosting and performance.** Moved both domains off legacy hosting onto a dedicated Cloudways server with SSL and SPF, DKIM, and DMARC all passing. Turned on Varnish page caching and fixed cache invalidation so listings update the instant a job is posted or closed. Rebuilt the job import pipeline: first run brought in 5,000 fresh jobs with 0 errors, hid 18,470 stale listings without deleting a record, and now runs hourly. Cut the database from 649 MB to 110 MB with no data lost, and sized the platform for 50,000 live jobs.

| Page | Before | After |
|---|---|---|
| Home | 32.3s | 3.09s |
| Job search | 22.4s | 2.36s |
| Keyword search | 30.3s | 2.38s |

Mobile PageSpeed hit 72 on Home and 80 on Jobs. At launch the server was building pages in under a second.

**Subscriptions and payments.** Compared WooCommerce Subscriptions, Stripe Billing, and GoHighLevel Payments, then built on WooCommerce Subscriptions with Stripe: payment retries, prorated charges, plan switching. Three employer tiers (Starter, Growth, Pro), monthly and yearly, all priced from a single source of truth, with a 14-day trial each account can use exactly once. Plan gating covers team seats (1, 3, 10, and a downgrade pauses extra members rather than deleting them), candidate messaging on Growth and Pro, active job and resume search limits, and the "HOTS · Hires on the spot" badge on jobs from paying employers. Safeguards run both directions: nobody gets access without a successful payment, and a failed renewal never wipes an employer's plan or their live jobs. Plus branded receipts for payments, renewals and refunds, a complimentary partner plan, and discount codes. Before launch we ran a payment test suite across trials, upgrades, downgrades, cancellations, reactivations, renewals, failed payments, refunds, and declined cards.

**CRM integration (GoHighLevel).** Built a custom website-to-CRM bridge pushing 15 payment events and 15 hiring events into GoHighLevel, with hiring events landing in 30 to 90 seconds. Moved all 28 customer emails into GHL under one consistent branded design: sign-up, password reset, job alerts, interviews, hiring decisions, team notifications, billing. Automated tagging for candidates and employers, with 30 CRM tags organised into 7 categories, duplicate contact prevention, and delivery logs with retries. Migrated 257 of about 259 waitlist contacts into the CRM before launch.

**Product features.**

- **Same-day interviews.** Employers flag jobs for same-day hiring, candidates filter for them. Passed 16 of 16 sealed tests and 21 of 21 browser tests.
- **Video interviews.** Scheduling across Zoom, Google Meet, Teams, and Webex with time zone handling, Add to Calendar, and saved default meeting links. Candidates can confirm, request another time, or decline. 39 of 39 checks passed.
- **Job search.** Filters for type, category, location, experience, pay, and date posted, plus ZIP code and distance search, City/State autosuggest, Google for Jobs markup, and a "HOTS jobs only" toggle.
- **Job alerts.** In-site notifications and daily emails with one-click unsubscribe.
- **Profiles.** Redesigned candidate profile with job preferences, 13 HOTS categories, and ZIP-based locations. We stripped sensitive fields: race, gender, street address.
- **Content and UX.** Notification bell, redesigned account and mobile menus, consistent job cards, launch countdown, and new pages for Interview Tips, Careers, Job Fairs, and the Affiliate Program.

**Security and privacy.** Security headers grade F to A. Made candidate CVs private so only the candidate, admins, and employers they actually applied to can open them, and locked down the public media API. Closed permission holes in team management and interview booking. Removed leftover malware tasks, unknown admin accounts, and old developer access, rotated payment keys, and set up a daily security check. Post-launch our monitoring caught a malicious upload and contained it quickly: we cleaned the site, diffed every file against a known-clean copy, and hardened further.

**Accessibility (ADA).** Audited all 39 pages and fixed 17. WAVE errors to 0 on Home and Find Jobs, Lighthouse accessibility 100 on Home, Find Jobs, and FAQ. Passed screen-reader testing on a phone.

**Launch-grade QA.** A 112-case launch test plan across payments, plans, discounts, hiring, interviews, alerts, and mobile, producing a report with 283 screenshots. A final read-only launch audit surfaced 56 findings; we fixed the critical ones and gave the launch a documented "Go with conditions" decision. Tested desktop, tablet, and phone down to 390px and 360px, and walked all 45 public links on the 12 main pages with none broken.

## Launch

Live at hireonthespot.com on schedule, Oct 12, 2026. Old .ai links redirect automatically to the new domain. We verified on 5 screen sizes and ran a real card payment end to end: trial started, paid features unlocked, emails arrived. Then we switched on live CRM workflows and job alerts.

## After launch

Daily monitoring, weekly releases, and the engagement moved into growth and analytics.

- GA4 and Search Console set up with conversion tracking for registrations, applications, trials, and paid subscriptions. Cut the sitemap from 69 pages to the 11 that are actually public.
- A live investor dashboard in Looker Studio, six tabs, refreshing every four hours, working on mobile. GA4 is capturing roughly 95% of real sign-ups.
- Early traction: 879 registrations in the first 9 days (867 candidates, 12 employers) and 9,162 visitors in the first measured days.
- Planned for scale: job import now backs off when the server is busy, server upgrade paths prepared, and a long-term architecture study written for AI features (candidate matching, calendar integration).

## Key technical decision

We did not rewrite. An audit-driven remediation inside WordPress was the right call because the client had a fixed launch date four weeks out and an existing content and job corpus. A rewrite would have missed the date and thrown away working ground. So we treated the live platform as a patient: version-control it first, back up before every change, verify both sides, and fix in dependency order. Infrastructure and speed, then payments, then comms, then features, then security and accessibility, then QA.

The one place we built new rather than configured was the CRM bridge. Off-the-shelf WordPress-to-GoHighLevel plugins could not carry 30 distinct payment and hiring events with retries and delivery logging, so that layer is custom.

## Stack

WordPress, WooCommerce Subscriptions, Stripe, GoHighLevel, Cloudways on DigitalOcean, Varnish, Google Analytics 4, Google Search Console, Looker Studio, GitHub.

**This is a deliberate deviation from the default stack.** Anchor HOTS for the engagement shape, meaning inherited broken platform, audit, remediation, hard launch date, ongoing ownership. Do not use it as evidence of a FastAPI or Next.js build. If the job is a WordPress or WooCommerce platform, this is the strongest and most recent proof in the portfolio.

## Result

- Launched on time, four weeks from kickoff, with a delivery every Friday
- About 10 times faster on the pages that matter most
- A working revenue engine: live Stripe subscriptions, tiered plans, trials, and safeguards both directions
- Every customer email and event flowing through the client's CRM instead of scattered across the site
- Security headers A, CVs private, accessibility 100
- The client owns their code and data: GitHub repo in their name, plus documentation and guides for their team
- Close to 900 sign-ups in the first 9 days

## What's notable

The strongest "someone else broke it, fix it and ship it" story in the portfolio, and the only one with hard before/after numbers across speed, security, database size, and accessibility inside a single four-week window. Also the deepest GoHighLevel integration work in the portfolio: 30 events, 28 emails migrated, 30 tags across 7 categories. Use it whenever a client is mid-rescue from a previous developer, has an audit document in hand, or needs GHL wired into a product rather than just a funnel.

Client quote pending.
