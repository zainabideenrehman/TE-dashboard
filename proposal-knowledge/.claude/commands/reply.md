---
description: Conversation-driven follow-up. Diagnose the thread, write two paste-ready replies
---

Read the raw thread from `conversation.md` in the current folder (or the file Hassan names).
Also read `briefing.md` and `proposal.md` in the same folder if they exist, so the reply
matches what was pitched and the client's business. Read `_reference/voice-rules.md` before
writing the variants. Write the result to `reply.md` and show it. Absorbs the old `/followup`.

## Input
- Default source: `conversation.md` (the raw pasted Upwork thread). Named file or path wins.
- No conversation file: fall back to the no-reply case using `proposal.md` (cold proposal or
  invite, client has not responded yet).
- Nothing to work from at all: ask ONE clarifying question (paste the thread), like
  `proposal.md` handles a vague brief. Do not guess.
- Parse who said what (Hassan vs client). Ambiguous? State the assumption in the Situation read.

## Diagnose the state FIRST (the job)
- Who spoke last, and how long quiet if timestamps are present.
- The OPEN LOOP: what the client is waiting on, or what Hassan left hanging.
- Funnel stage -> the play:
  * No reply (cold proposal OR invite) -> re-engage with fresh value. Invites get a warmer, more direct tone.
  * Interested then went quiet -> value-first nudge. Never a bare bump.
  * Price or budget objection -> reframe value, OR offer a smaller paid first step. Never reflexively discount.
  * "Let me think" / "I'll get back to you" -> give a concrete reason to reply now.
  * Post-call, awaiting decision -> recap plus ONE clear next step.
  * Client asked for something (samples, references, a time, a scope doc) -> deliver it or propose it.
  * Scope still forming -> move toward a call or a concrete next step.
- Read the likely hesitation between the lines. Match their energy.

## Message strategy (what wins replies on Upwork)
- ALWAYS give a reason to reply. Each message adds something NEW: a fresh idea, a quick
  observation about their business, a teased example, a Loom offer, or call availability.
- NEVER a bare "just checking in", "bumping this", "circling back", "following up" (banned filler).
- Short. 2-4 sentences per variant. Use the client's first name if known.
- The two variants must be genuinely DISTINCT, situation-appropriate angles. Quiet -> soft nudge
  vs value-add. Price -> reframe value vs smaller paid first step. Post-call -> recap + next step
  vs recap + propose a specific time.
- Cadence: if Hassan already followed up once or twice in the thread, go lighter and offer a
  graceful exit. Never beg, never sound desperate. Hassan is a peer, not a vendor chasing.

## Portfolio (usually none)
A reply is lighter than a proposal. Read `_reference/portfolio/_index.md` and at most ONE anchor
file ONLY if a variant genuinely leans on a specific example. Tease a same-industry client, never
name it. Automotive -> AutoCar, kids education -> Ludooka. Never fabricate experience.

## Internal vs client split (critical)
- "Situation (for you)" is INTERNAL, Hassan only. Normal punctuation, em dashes allowed. NOT client-facing.
- The two variants ARE client-facing. Every voice rule applies: third-grade reading level, ZERO
  em dashes ("—", "--", " - " as a dash), no exclamation marks, natural contractions, no banned
  buzzwords or filler, 90% client / 10% Hassan, first person as Hassan.

## Output shape
Write `reply.md` in exactly this shape (the `##` lines are the literal output, not sections of this command):

```
## Situation (for you)
- who spoke last, how long quiet
- the open loop
- read on the hesitation
- the play

## Option 1 - [angle label]
[paste-ready message]

## Option 2 - [angle label]
[paste-ready message]
```

## Final check before output
Scan BOTH variants character by character for "—", "--", and " - " used as a dash, zero allowed /
no exclamation marks / no banned buzzwords or filler / no bare "just checking in" or bump / each
variant gives a fresh reason to reply / two DISTINCT angles that fit the stage / 2-4 sentences each
/ first name if known / warmer if invite / lighter with a graceful exit if already nudged / never
desperate / real experience only, same-industry teased not named / 90-10 ratio / first person as Hassan.
