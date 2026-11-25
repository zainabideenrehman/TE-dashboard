# BambooVPN

**Clients:** Per Markus Akerlund and Jim
**Industry:** Consumer privacy and VPN
**Timeline:** 5 months, ongoing
**Team:** 1 person

## The problem

The clients wanted to launch a full consumer VPN brand. Phone. Laptop. Browser. Every surface where a user might come from.

They had nothing. No apps. No payments. No infrastructure to actually tunnel traffic.

Each platform also brings its own attribution, paywall, and billing requirements that don't translate between iOS, Android, and desktop. "Just ship one app" wouldn't have worked.

## What we built

A complete VPN product that runs the same account everywhere: Windows, macOS, iOS, Android, and a Chrome, Edge, and Brave extension. Users sign up once and their subscription, devices, and dedicated IPs follow them across every device.

- **Single source of truth for auth and subscription.** iOS uses in-app purchases plus Superwall. Android uses Play Billing plus Superwall. Desktop and the web dashboard go through Stripe. Behind it all, one Node API treats every store as a payment provider, not a separate user system.

- **Per-user dedicated IPs.** Users get IPs that stay with them across reconnects and devices.

- **Next.js dashboard.** Users manage their plan, devices, and dedicated IP from a web interface.

- **Unified attribution.** RevenueCat for store subscriptions. Superwall for in-app paywalls. Adjust for install attribution. The client sees revenue regardless of where the user signed up.

## Key technical decision

Built a WireGuard peer pool instead of two common alternatives that small VPNs use.

- Sharing one `wg0.conf` across all users: insecure, no per-user attribution.
- Generating WireGuard keys on the fly per connection: slow, fragile, breaks roaming.

We pre-generate N peer slots per server with a bash script and store them in MongoDB. On connect, the API atomically leases one to the device. On disconnect, it gets released. A 10-minute cron sweeps any lease that goes stale past 24 hours.

The result: per-user accountability, clean device limits, no latency hit from dynamic key issuance. Adding a new region is as cheap as running one script.

## Stack

Web dashboard: Next.js. API: Node and Express. Database: MongoDB. Mobile and desktop apps: Flutter. Tunnel: WireGuard. Payments: Stripe (desktop and web), RevenueCat (store subs), Superwall (paywalls), Adjust (attribution).

## Result

One codebase produces five native surfaces (iOS, Android, macOS, Windows, browser extension) sharing one account and one subscription. Most VPN startups don't get this right until v3.

## What I'd do differently

Put OAuth (Google and Apple) in on day one instead of bolting it on later. Switching auth providers after the fact means touching every client. Every. Single. Client.
