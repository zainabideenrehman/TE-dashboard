# Debt Shield

**URL:** debtshield.ai
**Industry:** Life insurance, IMO and agency-owner model
**Team:** 2 developers
**Lovable:** Built on Lovable + Supabase (hosted); Claude Code used alongside for agents/automation.  [lovable:built-on] [claude-code]

## The problem

Life insurance IMOs and agency owners track revenue. They don't track exposure.

When carriers report commission balances or chargebacks against agents, owners estimate downside instead of reading it off the data. Hierarchies make this worse. An agency owner sits on top of a tree of agents and sub-agents, and a chargeback at the bottom rolls up to liability at the top.

Carrier and IMO email isn't enforceable leverage when agents push back. Manual chasing doesn't scale. If a dispute goes legal, the audit trail is a mess of inboxes and spreadsheets.

## What we built

A platform that turns carrier data into enforceable workflow.

- **Carrier file ingest.** Upload statements from multiple carriers, get a unified debt and exposure view in one place.

- **Hierarchy-level visibility.** See what an agent owes. See what their upline owes including them. Roll up exposure across the tree.

- **E-signed agent agreements.** Owners send accountability documents through the platform. Signed copies live next to the exposure data.

- **Automated enforcement.** Cadences, outbound SMS and email, inbound reply handling. Every action appends to a case timeline so the owner is not the glue.

- **Owner console.** Separate product-side console for managing carriers, tenant admins, file intake, and cadence configuration.

## Key technical decision

Enforcement state lives in PostgreSQL only. Not duplicated in React state. Not duplicated in each Edge Function.

The platform has three trigger sources: UI actions, cron-style scheduled jobs, and inbound SMS or email webhooks. If enforcement rules (pause this case, resume that one, escalate after 7 days) lived in multiple places, the system would send wrong messages and produce mismatched case history.

Single source of truth next to the data. Every trigger reads the same state and writes back to the same place.

## Stack

Frontend: React, TypeScript, Vite, Tailwind, shadcn/Radix, React Router, TanStack Query. Backend: Supabase (Postgres, Auth, Storage, RLS, Edge Functions). Email: Resend. SMS: Twilio. Testing: Vitest and Playwright.

## Result

Four carriers wired through the product: Mutual of Omaha, Americo, Ethos, American Amicable.

The product replaces a workflow built from email threads and spreadsheets with one that produces a signed agreement, an automated cadence, and a complete case history per agent.

## Why it matters

This is not a reporting tool. It's an end-to-end product: carrier ingest, contracts, automated enforcement, unified case history. Owners stop estimating exposure and start acting on it.
