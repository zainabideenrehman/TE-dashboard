# LinkedIn Outreach Platform

**Client:** Tech Emulsion (internal sales tool)
**Timeline:** 8 weeks total (4-week n8n prototype, then 4-week FastAPI rebuild)
**Team:** 2 (Phase 1: Ahmad Usman and Arshad; Phase 2: Fazal Wahid)

## The problem

Manual LinkedIn outreach takes 3 to 5 hours a day per rep. Personalization is what makes connection requests work, but personalization is what takes the time. Most reps skip it.

Existing tools handle pieces of the pipeline. Scrape profiles. Enrich data. Send connection requests. But stitching them together across multiple platforms is fragile, and none of them write a personal note that actually feels personal.

## What we built

A LinkedIn outreach platform with a live dashboard. Paste a search URL, and the system handles the rest.

- **Scrape.** Pulls profile data, bio, work history for every result in the search.
- **Enrich.** Adds context the AI needs to personalize.
- **AI note.** Generates a personalized connection request based on the prospect's actual background.
- **Send.** Submits the request through LinkedIn.

Operators set daily limits, watch live progress, and cancel anytime.

## Key technical decision

Used MCP to pass LinkedIn's accessibility tree directly to the LLM, letting it decide which button to click and where to act, instead of hardcoded selectors or XPath.

This matters because LinkedIn changes its UI constantly. Selector-based automation breaks every time they ship a frontend change. By giving the LLM the live page structure and letting it reason about which element to click, the tool keeps working through UI updates.

## Stack

Backend: Python, FastAPI. Browser automation: Playwright (Chromium). LLM: Qwen via DashScope. Database: Supabase. Frontend: React 19, Vite. Live progress: Server-Sent Events.

## Result

- About 250 connections per week, fully automated
- Manual benchmark: 20 to 40 per week
- Human effort under 1 hour per week (setup and monitoring) vs 20 to 35 hours manual
- Each connection takes ~2 minutes of automated runtime, so 250 per week runs ~8 hours in the background unattended

## What I'd do differently

Skip the n8n prototype phase. Go straight to FastAPI. The rebuild cost 4 weeks we didn't need to spend.

The human simulation layer is what keeps the tool from getting flagged by LinkedIn. That work paid for itself.
