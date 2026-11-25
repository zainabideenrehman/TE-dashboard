# Pack Assist

**Client:** Uzair, packaging industry
**URL:** packassist.techemulsion.com
**Timeline:** May 2025 to December 2025 (8-week V2 build)

## The problem

The client ran a sales chatbot that was burning money and lying to customers.

- Every visitor triggered paid AI tokens, even window shoppers who never bought
- The bot invented shipping zones and made up business rules that didn't exist
- Agents had no way to handle volume. The interface couldn't manage more than a handful of chats at once
- Weekends and after-hours leads dropped through the floor

The product worked. The operations around it didn't.

## What we built

A V2 rebuild on Python and FastAPI with one design goal: control costs and kill hallucinations.

- **Hybrid init.** The first three to four messages are static questions (name, email, what they need). Paid AI only fires after the lead qualifies. Casual browsers never cost a token.

- **Zendesk-style agent dashboard.** One agent now handles 30 plus simultaneous chats. High-density view with quick switching.

- **Ghost typing.** Agents see what a visitor is typing before they hit send. They prep responses faster.

- **Visitor path tracking.** Agents see the full journey, source through home through product page, before they reply. Context-rich pitches, not cold openers.

- **Per-chat AI toggle.** Agents flip the AI off when they want to handle a chat manually. Total control.

- **RAG-grounded answers.** No more invented shipping zones. The bot cites real business rules. Standards like 350 GSM packaging thickness come from the knowledge base, not the model's imagination.

- **US versus UK localization.** IP detection switches spelling (color/colour) and regional shipping rules automatically.

- **Weekend mode.** During the week the bot supports human agents. On weekends it flips to full autonomous mode so no lead is missed.

## Key technical decision

Hybrid static-then-AI architecture instead of full AI from the first message. Most chatbot tools route every message through the LLM, which is expensive and slow. By gating the first three questions through deterministic logic, we filtered out 60 to 80 percent of low-intent traffic before incurring any AI cost. The remaining conversations got the full LLM treatment with RAG grounding.

## Stack

Frontend: React, Tailwind, Socket.io client. Backend: Python, FastAPI, Socket.io server. AI: OpenAI (GPT-4o-mini and GPT-4.1), LangChain, Pinecone for vector memory. Database: MongoDB.

## Result

- Significant reduction in AI overhead through hybrid filtering
- Hallucinations eliminated via RAG fact-checking
- Agents now manage 30 plus chats from one interface
- New analytics report compares website visitors vs chatbot engagement for marketing insight
