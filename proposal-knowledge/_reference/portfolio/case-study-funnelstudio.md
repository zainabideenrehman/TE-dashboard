# FunnelStudio

**Client:** Markus, who runs direct-to-consumer (D2C) health and supplement funnels across several Shopify-backed brands. The Drive case study corrects the older "performance marketing agency" label.
**URL:** funnelstudio.ai
**Industry:** D2C e-commerce / direct-response marketing
**Type:** Multi-tenant funnel-commerce SaaS, in active production
**Timeline / team:** 6 months, 3 people (Hassan's figures; not in the Drive docs)
**Source of truth:** Drive `FUNNELSTUDIO-TECHNICAL-CASE-STUDY.md` + `FUNNELSTUDIO-CASE-STUDY.md` (Jul 2026). Updated here 2026-10-29.

## The problem

Direct-response marketers need many funnels fast, on their own domains and their own payment accounts. The old way was designer → developer → DevOps, two or three days per test, and by then the ad spend window is half gone. Off-the-shelf funnel builders (ClickFunnels, Funnelish) cost money, force their own checkout, and limit design. Post-purchase upsells and multi-provider payments are easy to get wrong.

## What we built

Clone → edit → publish → sell → optimise, in one product.

- **Cloner.** Playwright renders the page in a real browser, captures the DOM, styles and lazy-loaded assets, and rewrites URLs. A generic "fix-the-class" sanitizer repairs sliders, accordions and JS-framework hydration so static clones still work, and a pixelmatch screenshot diff scores fidelity.
- **AI editing.**
  - AI Quick Edit returns a strict JSON action schema that is validated, auto-corrected and sanitised before it touches the page.
  - An agentic Claude chat with ~20 tools (edit HTML/CSS, add section, backup, diff) and a 50-turn cap.
  - Research-driven rewrites, and ad image/copy/voice generation.
  - Claude is the primary model, with OpenAI as fallback.
- **Commerce (the core product today).**
  - Embedded Stripe Payment Element / PayPal on the cloned checkout, with Stripe Connect so buyers pay the merchant's own account.
  - A Stripe / PayPal / NMI provider pool with failover.
  - One-click post-purchase upsells: off-session charges with SCA handling.
  - Orders, refunds and disputes, plus Shopify order sync with a retry queue.
  - Discounts, shipping, tax and multi-market pricing.
- **Idempotent money path.** Inline confirm, 3DS redirect recovery and the Connect webhook all converge on exactly one order, through an atomic upsert on a unique PaymentIntent index.
- **Custom domains with automatic SSL.** Cloudflare Custom Hostnames with a certbot fallback, plus cron reconciliation and renewal.
- **A/B testing.** Server-side deterministic bucketing, HMAC-signed conversion postbacks, and Bayesian + frequentist stats.
- **Tracking.** Klaviyo, HYROS, ClickMagick, Meta CAPI, PostHog.
- **Platform.** Subscriptions + a credit system that meters AI (atomic non-negative deduction, Pro overage cap), a REST API (`/api/v1`) and an MCP server.

## Key technical decisions

- **Playwright for cloning, not Cheerio alone.** Static scraping is blind to JavaScript, and React, Webflow or Framer sites come back half-empty. Playwright captures the fully rendered page, and Cheerio still handles parsing afterwards.
- **One finalisation function shared by three payment paths**, so a paid buyer always yields exactly one order.

## Stack

React 18, Vite, Redux Toolkit, Tailwind + MUI, Fabric.js. Node/Express, MongoDB (Mongoose, ~55 models), Redis + Bull. Playwright + Cheerio. Stripe + Connect, PayPal, NMI, Shopify, TaxJar. Anthropic, OpenAI, Gemini, Replicate, Freepik, ElevenLabs. Hetzner VPS, nginx, PM2, Cloudflare, Let's Encrypt. Apify, ScrapingBee, Browserless.

**Not in use**, though an older version of this file listed them: Pinecone, Groq, LangChain, Hugging Face. The packages are installed but there's no runtime usage. There is no RAG.

## Result

In active production. The client runs live funnels across multiple Shopify-backed D2C brands on it and takes real payments. It's multi-tenant, so other merchants can be onboarded.

Hassan's figure (not in the Drive docs): time to publish a branded page on a custom domain dropped from 2–3 days to under 10 minutes.

## What I'd do differently

Pick one UI framework on day one. We started with Tailwind and added Material UI later, and the codebase still runs both.

## Do not claim

- Pinecone, RAG, vector search, Groq.
- Order volume, revenue, conversion lift or merchant counts (not confirmed).
- The client's brand names in client-facing copy (the Drive doc says they can be removed from external copies).
- Formal CI/CD, staging or end-to-end tests (not confirmed; deploys are manual).
