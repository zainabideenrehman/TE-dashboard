# Prospector

**Client:** Marketing agency, San Diego (undisclosed)
**Industry:** B2B marketing, outbound lead generation
**Type:** Autonomous AI outbound agent
**URL:** leadscraper-tawny.vercel.app
**Lovable:** Started on Lovable, migrated to Claude Code.  [lovable:migrated] [claude-code]

## The problem

Marketing agencies live or die on outbound. Finding the right businesses, getting clean contact data, warming prospects with something worth opening, and running personalized campaigns is a full pipeline. Most of it is manual, and personalization is the first thing dropped when volume climbs.

The agency wanted outbound that runs itself without turning into generic spam. Real targeting, real enrichment, and a first touch that shows value, at a scale a small team can't hit by hand.

## What I built

An autonomous agent that runs the full outbound pipeline and keeps a human in control.

- **Lead sourcing.** Scrapes businesses and contacts with Apify.
- **Enrichment.** Cleans and fills contact data through Hunter and Explorium.
- **Lead magnets.** Builds assets worth opening. The standout: it rebuilds a prospect's outdated website into a modern version and deploys it to a live server automatically, so the first touch is a working demo of what the agency can do.
- **Campaign writing.** Identifies the agency's ICP, positioning, offers, and tone, then writes Instantly campaigns personalized to each prospect in the agency's own voice.
- **Outbound and CRM.** Launches campaigns straight into Instantly and syncs everything to GoHighLevel.
- **Two ways to drive it.** Chat with the agent in the app, or drive it from Claude over MCP, to review and approve before anything sends.

## Key technical decision

Autonomous, but never unsupervised.

The agent can run the whole pipeline on its own, but every outbound action waits on a human approval point. Each model step is wrapped in structured output and validation, so a bad enrichment or a malformed draft is caught before it reaches a real prospect. Every outside call is idempotent, so a retry never double-sends or double-charges.

That combination is what makes an autonomous agent safe to point at real prospects. The human approves, the validation catches model mistakes, and idempotency makes retries free.

## Stack

Frontend: React. Backend and data: Supabase, Postgres, pgvector. Model steps wrapped in structured output and validation. Every outside call idempotent. Integrations: Apify for scraping, Hunter and Explorium for enrichment, Instantly for email campaigns, GoHighLevel for CRM. The agent is reachable in-app or through Claude over MCP.

## Result

A working autonomous outbound engine for a San Diego marketing agency. It sources, enriches, builds a real lead magnet, personalizes off the agency's ICP and voice, and pushes approved campaigns into Instantly and GoHighLevel. The agency gets high-end outbound at a scale a small team can't reach by hand, without losing the human sign-off before anything sends.

## Why it matters

This is the modern shape of an AI product: an LLM core, a human approval point, and clean payloads out to third-party APIs. The agent does the work, validation keeps the model honest, and the human stays in control of what actually goes out.
