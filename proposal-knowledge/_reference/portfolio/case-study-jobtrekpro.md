# JobTrekPro

**Industry:** Field service management (FSM): cleaning, HVAC, plumbing, electrical and other businesses that send technicians to customer sites
**Type:** Multi-tenant B2B SaaS (web dashboard + technician mobile app). Lovable prototype rebuilt to production. Later rebranded **JobTitans**.
**URL:** jobtrekpro.com · iOS: apps.apple.com/us/app/jobtrek-pro/id6755515666 · Android: Google Play (full link in the portfolio sheet)
**Lovable:** Rescue — Lovable prototype rebuilt to production off-platform. [lovable:rescue]
**Source of truth:** Drive `JOBTREKPRO-TECHNICAL-CASE-STUDY.md` + `JOBTREKPRO-CASE-STUDY.md` (Jul 2026). Updated here 2026-10-29.

## The problem

The starting point was a Lovable prototype that looked like a field service platform but didn't work like one. Authentication failed intermittently, Supabase connections dropped, there was no real backend logic, Stripe wasn't integrated, and dispatch, scheduling and invoicing were mocked. The vision was a Housecall Pro / Jobber competitor.

## What we built

A production FSM platform covering customer → estimate → job → schedule → invoice → payment, for three roles: owner/admin, office staff or VA, and technician/contractor. Each service business is its own tenant with its own users, customers and connected Stripe account.

- **Scheduling and dispatch.** Calendar views, technician assignment, rescheduling that keeps the same job, cancellation, and a calendar map view with Google Maps address lookup.
- **Recurring jobs.** A Redis-backed background worker generates repeat jobs, so nobody re-creates them by hand.
- **Invoices and payments.** Invoices are linked to jobs, and customers pay through Stripe payment links. Stripe Connect destination charges (application fee + `on_behalf_of`) route money to each business while the platform keeps a fee. Payout records are tracked.
- **Customer messaging.** Twilio SMS with an in-app inbox (inbound webhooks matched to the business, customer and conversation), plus A2P 10DLC campaign registration.
- **Technician mobile app.** Expo, published to the App Store and Google Play. RevenueCat for in-app subscriptions (partially implemented).
- **Auth.** Google Sign-In. The backend verifies the Google token, then issues the app's own JWT.

## Key technical decisions

- **Rebuild, don't patch.** Kept the prototype's visual direction and replaced the foundation.
- **Connect charge type chosen on liability, not API simplicity.** With destination charges, the platform balance carries fees, refunds and chargebacks.
- **QuickBooks designed as one-way structural sync.** JobTrekPro owns the invoice structure, and payment/status flows back. Designed, not live.

## Stack

Web: React. Mobile: Expo (iOS + Android). Backend: Node.js, Prisma, PostgreSQL. Background: Redis queues + a dedicated recurring-job worker. Runtime: PM2, Nginx, AWS (Hetzner and Vercel were discussed later). Integrations: Stripe Connect, Twilio, Google Maps, Google Sign-In, Pusher, Resend, RevenueCat.

**Not** Next.js / Supabase / FastAPI. An earlier version of this file said so, and the Drive technical case study contradicts it.

## Lessons (from the technical case study)

- The team grew to several developers working in parallel, and inconsistent standards produced large components and uneven patterns. Fixed with standards, technical review, QA and documentation. Lesson: set architecture, conventions and review gates before scaling contributors. Good proof for "clean code another developer can pick up".
- Early role-specific user tables became tech debt. Lesson: build a unified identity and tenant-membership model first.
- Apple rejected the first iOS build because paid web plans also needed an in-app purchase path. Fixed with RevenueCat.
- A2P SMS registration held up the rollout. Lesson: treat messaging compliance as a product dependency, not a launch task.

## Result

A production multi-tenant FSM SaaS at jobtrekpro.com, with the technician app in both stores. No numeric outcomes (customers, revenue, job volume) are confirmed.

## Do not claim

- **Any AI feature.** None is confirmed in the core product. An AI front-desk concept was only explored.
- **A customer self-service booking portal.** Not confirmed. Customers get SMS, notifications and payment links.
- Route optimisation, live GPS tracking, live QuickBooks sync, automated test suites.
- "Built in weeks" or any other timeline (not in the Drive docs).
- **Ownership.** The Drive business case study calls it an internal TechEmulsion product, while the portfolio sheet logs it as an Upwork inbound. Write "I built", not "for a client", until Hassan confirms.
