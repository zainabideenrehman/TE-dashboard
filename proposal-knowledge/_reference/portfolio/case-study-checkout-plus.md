# Checkout+ Shopify App

**Client:** Per Markus Aakerlund
**Industry:** E-commerce, health and nutrition DTC
**Timeline:** 3 months
**Team:** 1 person

## The problem

The client ran shipping protection and post-delivery cashback through Onwards, a popular Shopify app. Customers paid 4 dollars to insure their order at checkout. The store kept about 1 dollar of it. Onwards took the rest as commission.

For a high-volume store, that 75 percent skim adds up to real money every month. The client wanted the same customer experience, owned end-to-end, with 100 percent of the protection revenue staying with the brand.

## What we built

A native Shopify checkout app that replaces Onwards 1:1.

- **Opt-in checkbox in main checkout.** Customer ticks a box, a small protection fee (default 4 percent of cart) gets added. The flow looks and feels native because it is.

- **Post-delivery cashback.** After delivery, the customer automatically receives a discount code (default 5 percent) by email. No manual work.

- **Customer claims portal.** Shoppers file lost, damaged, or stolen claims with photo evidence through a public route.

- **Merchant dashboard.** Store team reviews claims, approves refunds or reshipments, sees pending cashbacks, and manages multiple stores from one login.

## Key technical decision

The protection checkbox sits inside the main checkout page, not on the "thank you" page after payment. Most apps take the easier path and offer protection post-purchase, but customers mentally check out the moment they hit Pay. Anything after gets ignored.

By putting the option next to the order summary, we catch customers while they're still deciding. It also works correctly with Apple Pay and Shop Pay, which most post-pay apps break on.

This required Shopify Checkout UI Extensions plus a cart-transformer Function to inject the protection line item into the order at the right point in the flow.

## Stack

App framework: React Router 7 (Shopify App framework). Checkout integration: Shopify Checkout UI Extensions plus Shopify Functions (cart-transformer). Database: Prisma over PostgreSQL on Supabase. Email: Klaviyo. Hosting: Vercel. Cashback scheduling: node-cron.

## Result

- Client keeps 100 percent of protection fees, up from about 25 percent on Onwards
- 11 percent attach rate at the 4 percent fee on 6,500 orders since launch
- 695 insured orders captured
- Full feature parity with the app it replaced
