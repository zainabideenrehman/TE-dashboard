# ArtGola

**Client:** Ruth Oneya
**URL:** artgola.com
**Industry:** Marketplace for artists to showcase and sell their work
**Timeline:** Kicked off 17 April 2026, shipped in 2 weeks
**Team:** 2 people
**Lovable:** Built on Lovable (React + Supabase + Stripe).  [lovable:built-on]

## The problem

ArtGola had a platform but most of it was broken or manual.

- Artist onboarding was manual back-and-forth, blocking scale
- Stripe only showed one subscription option. No way to switch monthly to yearly.
- Search filters didn't return accurate results
- Map pins only worked at US state level. International artists couldn't be found by location.
- Google Auth was buggy. Roles weren't configured. Payments were assigned to the wrong accounts.

The product needed a working version of itself before it could grow.

## What we built

A complete rebuild of the core flows in two weeks.

- **Working artist onboarding.** Sign up, get approved, manage profile. No manual involvement from the ArtGola team.

- **Stripe plan switching.** Monthly and yearly plans show up correctly. Users switch between them in one click.

- **Search that works.** Location, date, and category filters return accurate results.

- **Global map pins.** Rebuilt to work worldwide with correct zoom behavior. Not just US states anymore.

- **Promo code system.** New users get 3 months free.

- **Founder model.** First 100 users pay nothing until 31 August 2026.

- **Admin panel.** Manage users, roles, and payments from one place.

- **Four roles working correctly.** Artist, Admin, Super Admin, and Founder. Each with its own permissions and subscription logic.

## Key technical decision

Used Supabase instead of a custom backend because the platform has four user roles with different permissions and subscription rules. Supabase Auth handles the auth layer natively, and the relational database made cross-role logic straightforward. We skipped writing and maintaining a separate auth service and kept the system easy to extend.

## Stack

Frontend: React. Backend: Supabase (Database and Auth, multi-role). Payments: Stripe. Builder: Lovable.

## Result

End-to-end onboarding works without manual involvement. All four roles function with the right permissions. Subscriptions run cleanly in both monthly and yearly tiers.

## What I'd do differently

Lock down the role and permission structure on day one. That's where most of the unexpected back-and-forth happened. Every fix touched roles in some way.
