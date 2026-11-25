# Portfolio Index — Vertical → Anchor Map

READ THIS FIRST when anchoring. Then read ONLY the 1-2 case-study files you
need. Do not read every file. All files live in `_reference/portfolio/` and
follow the naming `case-study-<slug>.md`.

## Mandatory anchors (non-negotiable)
| Job context | Lead anchor | Support / secondary | Rule |
|---|---|---|---|
| Automotive / dealership / Tekmetric / DMS | `case-study-autocar-intelligence.md` | — | ALWAYS lead with AutoCar. Mandatory. |
| Kids edu / publishing / COPPA / FERPA | `case-study-ludooka.md` | — | Always anchor Ludooka. |
| Voice AI / outbound calling / abandoned cart | `case-study-conversa.md` | `case-study-the-meatery.md` | Lead with Conversa (the platform). Cite Meatery as the flagship live deployment. |
| RAG / document Q&A / knowledge base | `case-study-avl-copilot.md` | `case-study-pack-assist.md` | AVL primary, Pack Assist secondary. |
| Long-term SaaS / CTO / retainer | `case-study-atarim.md` (MISSING — see note) | `case-study-jobtrekpro.md`, `case-study-rack-room.md` | Atarim is the intended anchor but the file is not yet in the folder. Until added, use JobTrekPro or Rack Room (real production rebuilds with ongoing scope). |
| Accounting / invoicing / Gmail automation | `case-study-linkedin-outreach-platform.md` (soft) | — | No exact accounting case study. Use the internal automation build as proof of self-built production automation. Soft anchor, contextualize honestly. |
| AI agent / autonomous LLM workflow / human-in-the-loop | `case-study-prospector.md` | `case-study-ludooka.md`, `case-study-good-food.md` | Lead with Prospector for agentic LLM workflows with an approval gate and third-party API pushes. |
| Content generation / brand voice / marketing copy | `case-study-good-food.md` | `case-study-content-compass.md` | |
| Claude Code co-work / skill files / continuous-learning / evals | `case-study-good-food.md` | `case-study-prospector.md` | Good Food is the deepest skill-files + learning-loop example. |
| Lead gen / cold outreach / LinkedIn SaaS | `case-study-jarvisreach.md` | `case-study-prospector.md`, `case-study-linkedin-outreach-platform.md`, `case-study-content-compass.md` | |
| Field service / scheduling / dispatch | `case-study-jobtrekpro.md` | `case-study-rack-room.md` | |
| Shopify / e-commerce app | `case-study-checkout-plus.md` | `case-study-the-meatery.md` | |
| NFC / QR / review collection | `case-study-poptrack.md` | `case-study-bipcards.md` | |
| Mobile (React Native) | `case-study-macromascot.md` | `case-study-superheart.md`, `case-study-bamboovpn.md` | |
| Marketplace / creator platform | `case-study-artgola.md` | `case-study-ludooka.md` | |
| Recruitment / scoring engines | `case-study-staffup.md` | `case-study-hire-on-the-spot.md` | StaffUp for the scoring engine. HOTS for a live, launched hiring marketplace. |
| Job board / job marketplace / hiring platform | `case-study-hire-on-the-spot.md` | `case-study-staffup.md` | HOTS is live with ~900 sign-ups in 9 days. Lead with it for marketplaces, StaffUp for matching logic. |
| Inherited / half-built platform, previous dev walked, audit in hand | `case-study-hire-on-the-spot.md` | `case-study-jobtrekpro.md`, `case-study-billboardiq.md` | HOTS is the only rescue with hard before/after numbers across speed, security, DB size and accessibility. JobTrekPro / BillboardIQ are Lovable-prototype rescues, a different shape. |
| WordPress / WooCommerce / subscription billing on WP | `case-study-hire-on-the-spot.md` | — | Only WordPress case study. Mandatory anchor if the job is WP or Woo. |
| GoHighLevel / CRM integration / transactional email migration | `case-study-hire-on-the-spot.md` | `case-study-prospector.md` | HOTS is the deep one: 30 events, 28 emails, 30 tags. Prospector pushes to GHL as one of several destinations. |
| Performance engineering / security hardening / ADA accessibility | `case-study-hire-on-the-spot.md` | — | 32.3s → 3.09s, security headers F → A, Lighthouse accessibility 100. |
| Hard launch deadline / launch QA / weekly delivery cadence | `case-study-hire-on-the-spot.md` | — | 4 weeks kickoff to launch, Friday deliveries, 112-case launch test plan. |
| OOH / ads / geo-viz / dashboards | `case-study-billboardiq.md` | — | |
| Landing pages / marketing funnels / D2C checkout and upsells | `case-study-funnelstudio.md` | — | Also the anchor for Stripe Connect / PayPal checkout, one-click upsells and custom-domain SSL. |
| AI vision / OCR / photo → structured data | `case-study-macromascot.md` | `case-study-ludooka.md` | MacroMascot is live with users and has the photo → validated data loop. Ludooka has scan/OCR import and the per-call AI cost ledger. |
| Compliance / insurance / regulated workflows | `case-study-debt-shield.md` | `case-study-ludooka.md` | |
| Link-in-bio / content tools | `case-study-podcast-beacon.md` | — | |

## Lovable footprint (which projects used Lovable — authoritative)

The case-study text does NOT reliably name Lovable; several Lovable builds never
mention it. Trust this list, not grep. Tags: `[lovable:built-on]` shipped/hosted
on Lovable · `[lovable:rescue]` someone's Lovable prototype rebuilt to production
off-platform · `[lovable:migrated]` started on Lovable, moved to Claude Code ·
`[claude-code]` Claude Code in the loop.

**Built on Lovable (shipped / hosted on-platform):**
- Ludooka — ludooka.com — `[lovable:built-on]`
- ArtGola — artgola.com — `[lovable:built-on]`
- Content Compass — content-compass.ai — `[lovable:built-on]`
- Debt Shield — debtshield.ai — `[lovable:built-on]` `[claude-code]` (Lovable + Supabase, Claude Code alongside)

**Started on Lovable → migrated to Claude Code:**
- Prospector — leadscraper-tawny.vercel.app — `[lovable:migrated]` `[claude-code]`

**Lovable rescues (prototype → rebuilt to production off Lovable):**
- JobTrekPro — jobtrekpro.com — `[lovable:rescue]`
- BillboardIQ (live brand: OOH Express) — ooh.express — `[lovable:rescue]`
- AutoCar Intelligence — link TBD — `[lovable:rescue]`

**Explicitly NOT Lovable (Claude Code only) — listed so it's never miscounted:** Good Food (`case-study-good-food.md`).

Source of truth: Hassan, June 2026. Extensible — append new Lovable projects here.

## Full case-study list (read on demand)
- `case-study-autocar-intelligence.md` — auto repair multi-shop dashboard, Tekmetric sync across 9 shops, reverse-engineered metrics [lovable:rescue]
- `case-study-conversa.md` — voice AI agent platform (Shopify cart recovery + enterprise agents)
- `case-study-the-meatery.md` — flagship Conversa deployment, premium meat on Shopify, abandoned checkout + cold outreach
- `case-study-ludooka.md` — AI children's book platform, live at ludooka.com. 7 resumable generation engines, scan/PDF import with OCR, per-call AI cost ledger, 32 languages incl. RTL/CJK, voice cloning, Lulu print-on-demand, Stripe credits [lovable:built-on]
- `case-study-avl-copilot.md` — RAG SaaS for professional AV industry
- `case-study-pack-assist.md` — AI sales chatbot for packaging, RAG-grounded, hybrid init
- `case-study-jarvisreach.md` — LinkedIn prospecting + email outreach SaaS, enrichment, scoring, sequences
- `case-study-linkedin-outreach-platform.md` — internal LinkedIn automation, ~250 connections/week
- `case-study-content-compass.md` — LinkedIn content analytics, multimodal AI (text/image/video/PDF) [lovable:built-on]
- `case-study-prospector.md` — autonomous outbound agent for a San Diego marketing agency: Apify scraping, Hunter/Explorium enrichment, auto-rebuilt website lead magnets, Instantly + GoHighLevel, ICP-personalized campaigns, human approval gate, driven in-app or via Claude over MCP. React + Supabase/Postgres/pgvector [lovable:migrated] [claude-code]
- `case-study-good-food.md` — AI content engine for a UK organic food brand: two-layer brand-voice validator, weighted human-in-the-loop learning loop, full Claude Code co-work harness (skills/commands/subagents/MCP/evals). FastAPI + LangGraph + Supabase/pgvector. [claude-code]
- `case-study-jobtrekpro.md` — field service SaaS (Housecall Pro competitor, later JobTitans), Lovable rescue rebuilt on React + Expo + Node/Prisma/Postgres + Redis worker. Scheduling/dispatch, recurring jobs, Stripe Connect, Twilio SMS inbox, tech app in both stores. NO AI, no confirmed customer portal [lovable:rescue]
- `case-study-rack-room.md` — UK data-centre rack fit-out ops, bookings/quotes/invoices
- `case-study-staffup.md` — recruitment SaaS, 7-criteria scoring engine
- `case-study-hire-on-the-spot.md` — US same-day hiring marketplace, hireonthespot.com. Half-built platform inherited from a previous dev, remediated and launched in 4 weeks (Sept 14 to Oct 12, 2026), now an ongoing growth retainer. Hosting migration, 32.3s → 3.09s, WooCommerce Subscriptions + Stripe tiers with trials, custom GoHighLevel bridge (30 events, 28 emails), security F → A, ADA 100, 112-case launch QA, ~900 sign-ups in 9 days. WordPress / WooCommerce, NOT the default stack
- `case-study-poptrack.md` — NFC/QR engagement SaaS, real-time redirect, leaderboards, multi-location
- `case-study-bipcards.md` — NFC review collection SaaS, analytics, Stripe billing
- `case-study-checkout-plus.md` — Shopify shipping protection app (Onwards replacement)
- `case-study-billboardiq.md` — OOH ad management, geo-viz, Lovable takeover to production [lovable:rescue]
- `case-study-funnelstudio.md` — funnel-commerce SaaS for a D2C supplements operator (funnelstudio.ai): Playwright page cloner, AI editor with agentic Claude chat, Stripe Connect/PayPal/NMI checkout, one-click upsells, Shopify sync, custom-domain SSL, A/B testing. Node/Express + MongoDB, not the default stack
- `case-study-debt-shield.md` — life insurance IMO compliance platform, carrier ingest, e-sign, cadences [lovable:built-on] [claude-code]
- `case-study-artgola.md` — ArtGola (fka Live Art List), artist marketplace, onboarding/payments/discovery rebuild [lovable:built-on]
- `case-study-macromascot.md` — gamified AI calorie tracker, live on iOS + Android, 3,000+ users (apps.apple.com/app/id6753281212). GPT-4o photo → strict structured output, user "Fix Results", formula fallback. Expo + Supabase (not Skia)
- `case-study-superheart.md` — AI nutrition tracking app, React Native, Supabase, Stripe, OpenAI
- `case-study-bamboovpn.md` — consumer VPN across iOS/Android/macOS/Windows/browser
- `case-study-podcast-beacon.md` — link-in-bio SaaS for podcasters, MERN + Stripe + AWS

## Maintenance note
When you add a new case study: drop the file here and add one row to the
relevant vertical above + one line to the list. If you add Atarim, update the
CTO/retainer row to remove the MISSING flag.
