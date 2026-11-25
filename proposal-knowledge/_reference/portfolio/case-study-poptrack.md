# Poptrack (Popcards)

**URL:** popcard.io
**Timeline:** August 2025 to October 2025
**Industry:** B2B SaaS, customer engagement

## The problem

Printed QR codes don't change. Once they're on a card or sign, the destination is locked. If the campaign changes, every card has to be reprinted.

Big chains have a second problem. They can't tell which staff member or which location actually drives the Google Reviews and social follows that come in. The data shows engagement but never the source. Staff have no reason to push customers to tap.

## What we built

A B2B SaaS that bridges physical touchpoints to digital action.

- **Dynamic redirect engine.** NFC cards and QR tags point at the platform, not the destination. Change the destination in the dashboard and it updates everywhere in real time.

- **Attribution analytics.** Every tap and scan ties back to a specific staff member and location. Metrics like Total Taps and Scans per Working Hour show who is actually driving engagement.

- **Gamified staff challenges.** Leaderboards turn the boring task of asking for reviews into a competitive game. Staff hit targets they can see.

- **Multi-location hierarchy.** One admin account manages hundreds of locations across a brand. Permissions, branding, and targets cascade down.

- **Integrated fulfillment.** Customization and ordering flow through Stripe. Branded cards ship without leaving the platform.

## Key technical decision

Built the redirect engine in Node and TypeScript with strict validation through Joi. The platform handles thousands of simultaneous scans in production, and one bad redirect rule could break a brand's entire physical campaign. Strict typing and validation at the request boundary was non-negotiable.

## Stack

React, Vite, Redux Toolkit (RTK Query), Material UI on the frontend. Node, TypeScript, and Express on the backend. MongoDB with Mongoose. JWT, Passport.js, and Joi for auth and validation. i18next for multi-language. Backend runs in Docker.

## Result

- 100 percent visibility into physical-to-digital conversions
- Operators can pivot campaigns in seconds, not days
- Staff engagement increased through transparent leaderboards
- Infrastructure handles thousands of simultaneous scans
