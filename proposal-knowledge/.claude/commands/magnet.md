---
description: Visual lead magnet (Hassan picks the type)
---

If Hassan didn't name a type, show this menu and ask which:
1. Agent flow diagram (Mermaid) — AI agent, chatbot, voice AI, RAG
2. Before/after flow (Mermaid or HTML) — automation, n8n, integrations
3. Branded HTML mockup — dashboards, admin panels, internal tools
4. Architecture diagram (Mermaid) — multi-system, API aggregation
5. ERD diagram (Mermaid erDiagram) — multi-tenant SaaS, marketplace
6. 30-day sprint timeline (HTML table) — MVPs, greenfield builds
7. Mobile wireframes (HTML/CSS hand-drawn feel) — React Native, mobile
8. Strategy comparison (HTML) — vague briefs, exploratory

Once picked, save the asset into `assets/` in the current folder and output:

Visual type: [name]
Render where: [mermaid.live | save as .html and open | paste into artifact]
Asset: [code in a code block]

## Rules
- Reference real brief details: company name, their tools, their use case.
  Bracketed [PLACEHOLDERS] only when detail is genuinely missing.
- Mermaid: raw code, no nested fences.
- HTML: complete file, inline CSS, no external deps. Tailwind CDN allowed.
- Visually clean. Hassan screen-shares for 20-30 sec. Readability > detail.
- Agent flow / architecture: include Langfuse in the observability layer when
  it fits. Part of the standard pitch.
