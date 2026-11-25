# Initiative — Offline-Loop Ad-Account Audit (productized offering)

*Working brief. Started 2026-06-29. Pick-up doc so a fresh session has full context.*

## Where this came from
Two warm inbound Upwork clients independently asked for pieces of the same capability:
- **Evan / Ping Marketing** (`2026-06-29_evan/`) — fiber/ISP lead-gen agency. Wants client
  **onboarding + initial Meta/Google ad-account audit** systematized. Offline-close funnel.
- **Fulya / Bowery Boost** (`2026-06-01_fulya/`) — DTC e-commerce performance agency. Wants
  **daily AI account diagnostics pushed to Slack** (reporting). Meta-heavy, ROAS KPI.

Hassan's hypothesis: same pain, lots of agencies have it, build it once + lead magnet +
outreach + case study. Validated with a market-scan workflow on 2026-06-29.

## What the research changed (the important part)
- **Don't build a generic "AI ad-audit engine." It's already free/commoditized.**
  - Meta shipped official **AI Connectors** (MCP, 29 read/write Marketing API tools, free open
    beta) on **2026-04-29**. Google/Amazon already had MCP. API access is no longer a moat.
  - Open-source **`claude-ads`** skill (MIT, ~6.6k stars, monthly releases) already does
    severity-tagged, dollar-impact, "senior media buyer" audits across Google+Meta+5 more, for $0,
    in the same Claude Code harness we'd build in. ~80% of the envisioned product.
  - Saturated "AI optimizer / daily-Slack" players: GoMarble, Anrie, Ryze, Madgicx, AdAmigo.

## The defensible wedge (uncontested)
**The offline-conversion closed-loop audit** for offline-close lead-gen accounts. No audit tool
checks whether the loop is alive: GCLID capture → CRM → Enhanced Conversions for Leads / offline
import actually firing → form-fills not mistaken for closed revenue. For ISP/fiber, home services,
med-spa, legal, real estate, the deal closes on a phone call, so form-fill metrics are noise.

**Timing catalyst:** Google's old `UploadClickConversions` path blocked / migrated to the Data
Manager API as of **2026-06-15**. Every lead-gen account wired before 2024 is silently
under-reporting conversions *right now*. Cold-outreach hook: "Is your offline import about to break
on Google's new API — and how much closed revenue is your account already not seeing?"

## Decisions made
1. **Beachhead = lead-gen / offline-close (Evan's side), NOT DTC.** Evan + Fulya are two different
   products at the build level (different KPI, platform weighting, reasoning logic, lifecycle
   moment). Don't build both. Serve Fulya's DTC daily-Slack ask by **configuring/wrapping an
   existing tool** (Anrie/GoMarble) on a retainer — that slot is saturated.
2. **Service-first, not SaaS.** Run paid scoped audit engagements ($1,500–5,000 market rate) on our
   own Claude harness, on top of free Meta MCP + Google API in **read-only** mode (also dodges
   Google Standard-Access compliance audit; we diagnose, human acts — same approval-gate pattern as
   Prospector/Good Food). Kill criterion: if 3–4 overlapping-scope clients don't show in ~60 days,
   keep it as a high-margin audit service line, don't build the product.
3. **No fabricated case study.** Hassan has ZERO shipped agency ad-audit product. Honest, stronger
   framing = three proven composable capabilities → "you'd be the first in this exact config, so
   it's a paid pilot":
   - **AutoCar Intelligence** — multi-account live-API pipeline, reverse-engineered metrics (9 shops).
   - **Prospector** — agency-facing AI agent pushing validated actions to GHL behind approval gate.
   - **Good Food** — Claude reasoning harness, severity-tagged rules + eval gate (content, but the
     pattern transfers).

## Recommended lead magnet
Interactive **"invisible conversions" / wasted-spend calculator** (hook) → free severity-tagged
**"Offline Conversion Loop Health Check" + short Loom**, delivered in 72h → strategy call. The
magnet doubles as the product demo, the outreach opener, and the source of the first honest case
study. Build via `/magnet`.

## Outreach (after magnet exists)
Warm two inbound clients first → r/PPC, r/googleads → PSA Slack, Grow Your Agency Slack → cold
email/LinkedIn to lead-gen agency owners using the Data Manager API deprecation hook.

## OPEN DECISION (resume here)
Confirm: commit to the **lead-gen / offline-close beachhead, service-first**? If yes →
next step is `/magnet` for the offline-loop health check + calculator. Alternative Hassan floated:
sketch the engine spec / audit rubric first.

## Pointers
- Evan briefing: `2026-06-29_evan/briefing.md` (deep ISP + GCLID/offline-loop glossary)
- Fulya briefing: `2026-06-01_fulya/briefing.md` (DTC, AutoCar anchor)
- Full market-scan output cached in this session's task output (workflow `agency-audit-market-scan`).
