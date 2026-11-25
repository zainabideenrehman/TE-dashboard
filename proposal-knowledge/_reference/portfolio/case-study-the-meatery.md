# The Meatery

**Client:** Premium meat distributor on Shopify (contact: Nick)
**Industry:** E-commerce, high-ticket DTC
**Type:** Flagship Conversa deployment

## The problem

The Meatery sells premium cuts. High order value, high customer LTV, but also high friction. Cart abandonment costs real money on big orders. Cold outreach to past buyers takes hours of staff time.

They had an internal voice AI tool but couldn't trust it. Two things blocked progress:

- Fear of triggering do-not-call violations
- Unreliable call logs that broke CRM attribution

The team couldn't launch the most valuable flow, abandoned checkout recovery, because the legal risk was too high.

## What we built

A hardened voice AI deployment running on Conversa's platform.

- **DNC Gatekeeper.** Every phone number checks against two PostgreSQL exclusion lists, global and client-specific, before a call ever fires. The client runs automation flows without legal fear.

- **Smart agent context.** The AI now knows who it's calling. Shopify data feeds into agent variables — order count, lifetime value, subscription status. A VIP subscriber hears different offers than a first-time buyer.

- **AI Judge.** n8n pulls call recordings, scores them on rebuttal handling and tone, and feeds the data back for prompt iteration. The agent gets less robotic with every cycle.

- **Campaign injection.** Operators upload a CSV (for example "Prime Rib buyers") and map it to a specific agent and script in minutes. Used to take days.

- **Real-time selling.** During the call, the agent creates a discounted Shopify draft order and texts the checkout link before the customer hangs up.

## Key technical decision

Multi-tenancy in PostgreSQL, not in the application layer. Every table got a client_id and row-level filters. This let the same codebase serve The Meatery and future Conversa clients without forking the platform. The DNC tables follow the same pattern — global rules apply to everyone, client-specific rules layer on top.

## Stack

Retell AI for voice and LLM. Node and Express for backend. n8n for automation glue. PostgreSQL on Railway. React admin.

## Result

The Meatery reactivated abandoned checkout recovery, the primary revenue driver, with confidence. Call data is now 100 percent captured. The platform proved the multi-tenant agency model and became the case study Conversa now sells against.

## What I'd do differently

Build the AI Judge feedback loop earlier. Most of the "robotic" complaints in month one would have surfaced in week one with automated grading.
