# Content Compass

**Industry:** Creator economy, LinkedIn analytics
**Type:** LinkedIn content intelligence and analytics SaaS
**URL:** content-compass.ai
**Lovable:** Built end-to-end on Lovable.  [lovable:built-on]

## The problem

LinkedIn creators play a numbers game without the numbers. They post and hope. Engagement spikes feel random because the patterns are hidden in months of historical data nobody has time to read.

The hard parts are qualitative. Which hook style actually works for this creator? What content pillars are they known for? Is the carousel pulling its weight against the text post? Manual tracking across multiple profiles eats hours every week, and the analysis is subjective anyway.

LinkedIn's native analytics shows your numbers. It doesn't tell you what to do next.

## What we built

An analytics platform that reads LinkedIn the way a human would, but at scale.

- **Multimodal content enrichment.** The system doesn't just track engagement numbers. It reads the actual content:

  - PDFs and carousels get text extracted for thematic analysis
  - Images go through OpenAI vision for visual content analysis
  - Videos run through Twelve Labs for indexing and summarization

- **Creator intelligence at scale.** Track up to 500 creators per user. For each one, the platform identifies:

  - Content pillars: the recurring themes a creator is known for
  - Hook analysis: which opening lines drive engagement
  - Posting patterns: optimal timing and frequency from their historical data

- **Real-time dashboard.** Recharts-based visualizations show performance across creators, posts, and time. Updates flow in via Supabase real-time subscriptions.

- **Background processing.** Scraping and AI enrichment run async. Users navigate the dashboard while the heavy work happens behind the scenes.

- **Rate-limited and secure.** IP-based throttling at 20 attempts per minute prevents abuse. Row Level Security on every table keeps customer data isolated.

## Key technical decision

Treated images, videos, and PDFs as content that needs to be read, not just stored. Most LinkedIn analytics tools count engagement on a media post but never look inside the media. By running OpenAI vision on images, Twelve Labs on videos, and text extraction on PDFs, the platform identifies content pillars across all media types, not just text posts. This is what makes the "content pillar" map work for video-heavy or carousel-heavy creators.

## Stack

Frontend: React 18, TypeScript, Tailwind CSS, Recharts. Backend: Supabase (PostgreSQL, RLS, Auth, Edge Functions). AI: OpenAI (text, image, document), Twelve Labs (video indexing). Data extraction: Apify for LinkedIn scraping.

## Result

- Hours of manual data entry replaced with automated scraping
- Creators get a clear "content pillar" map that keeps their brand consistent
- Architecture handles batch processing of hundreds of profiles in parallel

## What's next

AI content generation that uses the performance data to draft high-converting posts. Deeper sentiment and predictive analytics in the enrichment layer.
