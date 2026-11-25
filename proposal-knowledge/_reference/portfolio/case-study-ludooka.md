# Ludooka

**Client:** Sajad
**URL:** ludooka.com (live, confirmed by Hassan 2026-10-29)
**Industry:** Children's publishing + edtech (early literacy, language learning) + print-on-demand
**Type:** Inherited broken platform, rebuilt and extended into a full production product. Web app, plus iOS/Android shells from the same codebase.
**Lovable:** Built on Lovable (Lovable Cloud + Lovable hosting). [lovable:built-on]
**Source of truth:** Drive `LUDOOKA-TECHNICAL-CASE-STUDY.md` + `LUDOOKA-CASE-STUDY.md` (Jul 2026). The Drive business doc still says "pre-launch waitlist". That's stale: the site is live.

## The problem

Ludooka is an AI children's book platform. When Tech Emulsion took over, the codebase was broken in almost every layer: the book generation engine didn't work, authentication didn't work, there was no Stripe billing and no credit tracking, the frontend was unresponsive, giant functions sat in single files, and the Lulu print API wasn't integrated.

## What we built

One platform that owns the whole life of a children's book: idea → AI-written and illustrated book → studio layout → multilingual reader with narration → learning games → marketplace → printed copy.

- **7 creation engines:** Quick, Custom, Layered, WEE (character consistency), Scan a book, PDF upload, Audiobook. They are deterministic phase machines in TypeScript, not agents. Each phase is idempotent, checkpoints its output, and resumes after a crash (auto-continue after about 3 minutes with no progress).
- **Scan/PDF import with OCR.** On-device page detection and perspective correction (TFLite/TFJS + OpenCV). Only the cropped page goes to the model, with `max_tokens` capped.
- **Per-call AI cost ledger.** Every model call records its actual USD cost. Credits are reserved upfront, settled against real spend, and refunded on hard failure. Translations, word examples, word images and TTS are cached so the same work is never paid for twice.
- **Book Studio editor; page-flip reader** with language switching, sentence narration, and ElevenLabs TTS + voice cloning.
- **Translation** across a 32-language set, including RTL (Arabic, Hebrew) and CJK.
- **Print-on-demand via Lulu**, with a custom PDF typesetting engine (bidi, CJK line breaking, HarfBuzz font subsetting) and exact page-count maths so quotes match orders.
- **Stripe** covers subscriptions, credits, top-ups, digital purchases, print orders, self-publishing packages, and refunds/disputes with proportional clawback. Webhooks are idempotent: 332 + 159 events processed with 0 failures at audit time.
- **Also built:** a learning loop (flashcards, games, memory garden), a marketplace, organizations with seats (B2B), a self-publishing service with capped revision rounds, and admin recovery tools (webhook replay, refund reprocess, print recovery).

## Key technical decisions

- **Upgrade-only plan changes.** Cursor, Lovable and similar platforms don't show a downgrade button, because downgrade math (prorations, refunds, lost features) creates support nightmares. Here, upgrades are immediate and prorated, and scheduled downgrades are rejected before Stripe is touched.
- **One credit-grant path.** There's no reconciler in the grant path, so the webhook pipeline is the only code that grants credits and a bug can't be masked.

## Stack

Frontend: React 18, Vite, TypeScript, Tailwind, Zustand, TanStack Query. Backend: Lovable Cloud (Supabase) with Postgres + RLS on ~86 tables, Realtime, Storage, 156 Deno edge functions and pg_cron. Mobile: Capacitor 8. AI via the Lovable AI Gateway: Gemini 3.1 Pro (story), Gemini 3 Flash / 2.5 Flash Image (illustration), Gemini 3 Flash (translation), GPT-5.5 (OCR), Gemini 3.1 Flash Lite (word examples). Voice: ElevenLabs. Also Stripe, Lulu, Resend and Google OAuth.

## Result

Live at ludooka.com. Generation, billing, print and import all run in production. No user, revenue or conversion numbers are confirmed.

## What I'd do differently

Don't rush under client pressure. When a client pushes hard for speed, the temptation is to skip the test cycle, and skipping tests on AI generation pipelines is how you ship something that works on one book and crashes on the next.

## Do not claim

- User counts, revenue, or App Store / Google Play availability (the native shells exist, but a store release isn't confirmed).
- RAG/vector search, agentic orchestration, or automated AI-output evaluation (none of them exist).
- A full automated test suite. There are unit and regression tests, but the go-live QA plan showed 0/20 modules green at its last update.
