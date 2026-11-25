# AutoCar Intelligence

**Client:** Bob, auto repair multi-shop owner (9 shops)
**Industry:** Auto repair and aftermarket service
**Timeline:** 2.5 months
**Team:** 4 people
**Lovable:** Rescue — client's Lovable prototype rebuilt to production off-platform.  [lovable:rescue]

## The problem

Bob owns 9 auto repair shops. Each one runs on Tekmetric, the dominant shop management system in the space. To know how any shop was performing, Bob had to log into Tekmetric, switch to that shop, pull the data, then log into the next one. Nine logins to answer one question.

He'd also paid for a Lovable prototype before TE got involved. The prototype looked like a dashboard. It wasn't:

- Authentication didn't work
- Metrics on the graphs were hardcoded dummy numbers
- A real check against Tekmetric data showed the numbers were completely wrong
- No Chrome extension existed for inspection data, which Tekmetric doesn't expose in its API
- The internal Lovable Supabase couldn't handle production scale

## What we built

A multi-shop intelligence platform that replaces nine Tekmetric logins with one dashboard.

- **Real authentication.** Roles, sessions, and access control that actually work.

- **Tekmetric API sync every 2 hours.** Cron job pulls fresh data across all 9 shops automatically.

- **Reverse-engineered metrics.** From 1.4 million plus records, we computed gross, profit, profit margin, and repair order count per shop, per month, going back 3 years.

- **Three dashboards from one stack of data.**

  - Revenue and earnings: 36 months of history plus prediction lines for the rest of the year
  - Work in progress and aging: how much work is unpaid and how long it's been outstanding
  - Inspections: did the shops actually run every inspection they should have, did managers process repair orders correctly

- **Chrome extension for inspection data.** Tekmetric exposes inspection results in its UI but not its API. We built an extension that scrapes the inspection report page, normalizes the data, and pipes it to a Supabase Edge Function for ingestion.

## Key technical decision

Migrated off Lovable's internal cloud Supabase to a standalone Supabase project. The Lovable-managed instance was fine for prototyping but couldn't handle the row counts (1.4 million records and growing) or the query patterns this product needed.

Same Supabase API, different home. Performance jumped immediately. No more 30-second loads on year-over-year queries.

## Stack

Frontend: React, Tailwind. Backend: Supabase (Postgres, Auth, Storage, RLS, Edge Functions). Data source: Tekmetric API (2-hour cron sync). Non-API data: Chrome extension scraping the Tekmetric UI.

## Result

Roughly 8x time savings versus logging into each shop's Tekmetric account manually. Bob can take a quick read on any shop or all 9 together in seconds. The architecture is built to expand to more shops without changes.
