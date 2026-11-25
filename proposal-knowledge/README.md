# Proposals — Claude Code Environment

The Upwork proposal engine for Tech Emulsion, running in Claude Code.

## Daily workflow
1. New job comes in. Run the helper to make a folder:
   `bash ./new-proposal.sh clientname` (creates a dated folder with the right files)
2. Paste the raw job post into `job-post.md` inside that folder.
3. `cd` into the folder and start Claude Code.
4. Say: "discovery on job-post.md" → Claude researches + writes `briefing.md`.
5. Chat, refine, ask anything.
6. Trigger generation: `/proposal`, `/questions`, `/loom`, `/sheet`,
   `/magnet`, `/reply`. Each writes to the folder.

## Why it's structured this way (token efficiency)
- `CLAUDE.md` is small and always loaded (the voice + workflow + pointers).
- `_reference/` files load ONLY when a task needs them.
- Portfolio is split per project. Claude reads `_index.md` to find the anchor,
  then reads only the 1-2 files it needs. Not all 19.
- Each command's detailed rules live in its own file in `.claude/commands/`,
  loaded only when you invoke it.

Net effect: ~800 tokens of standing overhead instead of ~4000, with the rest
pulled in just-in-time.

## Structure
```
Proposals/
├── CLAUDE.md                 brain (always loaded)
├── new-proposal.sh           folder helper
├── .claude/
│   ├── commands/             the 6 slash commands
│   └── settings.json         permissions (web search native)
├── _reference/
│   ├── voice-rules.md
│   ├── discovery-format.md
│   ├── verticals.md
│   └── portfolio/
│       ├── _index.md         vertical → anchor map (read first)
│       └── *.md              one file per project
└── YYYY-MM-DD_clientname/    one folder per proposal
    ├── job-post.md
    ├── briefing.md
    ├── proposal.md
    ├── loom-bullets.md
    └── assets/
```

## Maintaining the portfolio
New project? Add a file in `_reference/portfolio/` and a line in `_index.md`.
That's it.

## Web search
Native to Claude Code via the WebSearch tool. No MCP needed. If you later want
Drive push for finished proposals, add it as an MCP in `.claude/settings.json`.

## Draft a proposal in Codex

Open this repository in Codex and paste the job after this prompt:

> Draft a proposal for this job. [Paste the full post here.]

Codex runs discovery first and returns a paste-ready draft for eligible jobs. It saves the original job, briefing, and proposal in a dated folder. Add screening questions and any team-approved demo links when you have them. Ask for screening answers separately if you need them. See [AGENTS.md](AGENTS.md) for proof selection and review rules.

