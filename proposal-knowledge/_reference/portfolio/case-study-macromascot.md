# Macromascot

**Client:** Markus
**URL:** iOS: https://apps.apple.com/app/id6753281212 ("Macromascot: Calorie & Fasting Tracker"). Android: live per the Drive case study; the Play link isn't in the portfolio sheet yet.
**Industry:** Health, fitness and nutrition (consumer)
**Type:** AI calorie-tracking mobile app (Expo / React Native) with a web onboarding funnel; subscription business
**Source of truth:** Drive `MACROMASCOT-TECHNICAL-CASE-STUDY.md` + `MACROMASCOT-CASE-STUDY.md` (Aug 2026). Updated here 2026-10-29.

## The problem

Calorie tracking apps are joyless. Logging every meal by hand (searching databases, guessing portions) is slow, so most users quit within days. The apps that win on engagement (Duolingo, Headspace) use mascots, streaks and play. Nutrition apps mostly don't.

## What we built

- **AI photo meal logging.** The photo is compressed on the device, uploaded to Supabase Storage, and sent through the `ai-chat` edge function to GPT-4o (temperature 0, max_tokens 500). The model must answer in a strict line-by-line `Key: Value` format with fixed enums. A parser reads it, and a "Not a food" guard stops non-food photos. The user then reviews, edits, or taps "Fix Results" (which re-prompts with their correction) before it's saved.
- **Barcode scan** via OpenFoodFacts (free, no AI call), plus describe-a-meal text logging.
- **AI nutrition plan.** Strict JSON with a degenerate-output check. If the AI fails or returns empty values, a deterministic Mifflin-St Jeor formula takes over, with a 15s safety timeout, so a plan always appears.
- **AI failure log.** Failed calls go to `ai_call_failures` (function, error type, message).
- **Gamification.** Mascot, coins, streaks and a shop; a friends feed with "vibes" over Supabase Realtime + push.
- **Fasting, activity and weight/BMI tracking**, with cron-driven reminders.
- **Monetisation.** Superwall paywall (StoreKit / Play Billing) plus a Stripe web funnel, bridged to the app by a one-time redemption code.
- **Admin analytics dashboard** (aggregate-only RPCs) and a support inbox.

## Key technical decision

AI with a deterministic fallback. Model output is forced into a strict contract and validated, and when the plan comes back empty or broken, a formula takes over. Only the estimate itself is AI-generated; all control flow is app code. That's the pattern to cite for any "photo → structured data" job.

## Stack

Expo SDK 53, React Native 0.79, TypeScript, expo-router, Zustand, Reanimated, react-native-svg. Supabase: Auth with Google/Apple, Postgres + RLS, Storage, Deno Edge Functions, Realtime, pg_cron. OpenAI GPT-4o, OpenFoodFacts, Superwall, Stripe, Expo Push, Resend. Web funnel: React + Vite on Vercel. Shipped with EAS Build / Submit.

**Not** Skia. An earlier version of this file said Skia, but the codebase doesn't show it.

## Result (owner-verified)

- 3,000+ registered users
- Revenue in the thousands of dollars
- Live on iOS and Android

## Do not claim

- Automated tests (none), LLM tracing, or per-call AI cost tracking (cost monitoring was only a recommendation).
- Skia animations.
- Ratings without rechecking them. The Play rating was about 4.88 from a few ratings (Aug 2026), and the App Store listing showed 4.1 from 28 ratings on 2026-10-29.
