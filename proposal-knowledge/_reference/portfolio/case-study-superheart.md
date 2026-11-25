# SuperHeart

**Industry:** Health and fitness, nutrition
**Type:** AI-powered mobile app

## The problem

Most nutrition apps make users type. Search for "grilled chicken," pick a portion, enter grams. Repeat for every meal. Adherence drops after week two because the friction is real.

The smartest nutrition trackers use AI to remove typing entirely. But adding AI doesn't fix the rest: payments, sync, user accounts, all still need to work.

## What we built

An AI nutrition tracking app with the basics right and the AI doing the heavy lifting.

- **AI-driven food logging.** Snap a photo of the meal and the app recognizes the food, returning both macro and micronutrients. Describing the meal in text works too.
- **Native mobile.** Built on React Native for iOS and Android.
- **Subscription billing.** Stripe handles plans and renewals.
- **Cross-device sync.** Supabase keeps food logs in sync across devices.
- **Water tracker.** Daily hydration logging alongside food.
- **Daily reminders.** Nudges to keep users logging and on track.

## Stack

React Native for the mobile app. Supabase for the backend (auth, database, storage). Stripe for subscriptions. OpenAI for the AI food logging.

## Result

A working nutrition app where typing is the exception, not the rule. Users snap or describe, the AI recognizes the food and quantifies it down to the micronutrient.
