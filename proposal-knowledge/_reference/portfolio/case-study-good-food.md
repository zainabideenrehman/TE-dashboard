# Good Food

**Client:** UK organic meat-box brand (confidential)
**Industry:** Direct-to-consumer organic food, e-commerce
**Type:** AI content engine with brand-voice validation and human-in-the-loop learning
**Timeline:** Ongoing
**Stack note:** Claude Code only. Not a Lovable project.  [claude-code]

## The problem

The client needed on-brand social content at volume. The founder has a specific voice, and the failure mode for AI copy is obvious the second you see it: it drifts into generic AI marketing voice. Discover this, elevate that, unleash the other. Writing every post by hand keeps the voice but does not scale. Handing it to a model scales but loses the voice and starts inventing facts.

The real requirement was never "generate posts." It was "generate posts that pass as the founder's, at volume, and reject anything that does not, automatically."

## What I built

An AI content engine that generates social posts in the founder's voice, validates every post against a fixed set of brand-voice rules, and only then expands each approved idea into platform-specific variants.

- **Idea generation** grounded in a tier-tagged knowledge base of the brand's products, positioning, and past work, retrieved per topic from a pgvector store.
- **A two-layer brand-voice validator.** Layer 1 is hard structural rules: banned openers, CTA format, no invented facts, geography checks. Layer 2 scores rhythm and voice. A post that fails is not patched with an exception path. The prompt or the rule gets fixed instead.
- **Platform variants.** Each approved idea expands into channel-specific versions without a separate manual rewrite per platform.
- **Operations.** Media routed to Cloudflare R2, scheduling, a content library, and Sentry for observability.

The principle, enforced in code and in the prompts: the AI prepares the repetitive parts, a human keeps the final say, and every rejection teaches the system something.

## How it learns from human judgement

This is the part that compounds. Review does not just approve or kill a post. It feeds the next batch.

- Approvals, weak approvals, and rejections all become weighted examples in retrieval. A strong approval counts for more than a weak one. Rejections are kept too, as negatives.
- A human hand-edit is the strongest signal in the system. When a reviewer edits a post before approving it, that edited version is stored close to canonical, at the highest weight.
- Rejections are auto-classified into labelled reasons: hallucinated fact, wrong voice, wrong geography, AI rhythm, CTA violation, corporate opener, not specific enough. Negatives are labelled, not just discarded.
- The next run retrieves these weighted good and bad examples straight into the prompt. The model sees what worked, what got rejected, and why.

The output gets more on-brand the more the system is used, because human taste is continuously turned into retrieval material.

## The Claude Code co-work setup

The app is the product. Claude Code is the harness I build it with, configured so it works to the project's standards by default.

- **Three CLAUDE.md files** load each session, so the assistant starts knowing the repo layout, the package manager, and the validator rules instead of relitigating them every time.
- **Custom slash commands** for the repeatable work: bring the dev environment up, run lint and type-check and tests in parallel, a cost-gated knowledge-base re-embed, an eval run against a frozen brief set, and a read-only pre-PR review that scans for leaked secrets before anything ships.
- **Subagents** with narrow jobs: a prompt-tuner that pushes back when I over-specify a prompt against one bad batch, a read-only voice-checker that scores a draft against the live rubric and refuses to soften the verdict, and a migration-writer that writes one safe database migration at a time.
- **An eval gate** that captures a before-and-after baseline around any change to a generation prompt, so a one-word prompt edit cannot silently swing the approval rate.
- **A persistent memory store** that holds my judgement-level preferences across sessions, so a correction made once is not forgotten the next time.

## Stack

FastAPI and LangGraph (Python) backend, Supabase and Postgres with pgvector for retrieval, Next.js and React frontend, Cloudflare R2 for media, Sentry for observability. Deployed on Railway and Vercel. Built and maintained with Claude Code as the development harness: skills, slash commands, subagents, and a Supabase MCP server for live-schema inspection.

## Result

A content engine that produces on-brand copy at volume and rejects off-brand drafts automatically, with a feedback loop that turns every approval, rejection, and edit into material the next batch learns from. The brand voice is enforced by construction, not by hoping the model behaves.
