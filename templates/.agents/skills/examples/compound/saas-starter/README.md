---
name: saas-starter
intent: |
  - "Build me a SaaS"
  - "Subscription business"
  - "Software product I can charge for monthly"
  - "B2B tool with billing"
  - "Membership site with paid plans"
  - "Build me a tool like Notion but for X"
keywords: [saas, subscription, billing, membership, b2b, plans, tiers]
---

# SaaS starter (compound — multi-feature roadmap)

**This isn't a single example.** A SaaS app composes auth + billing +
a domain feature. Read this README as a build order, then read each
linked example for the actual code.

## Build order

1. **`auth/email-password-login/`** + **`auth/oauth-google-login/`** —
   ship both. B2B users want their work email; consumer-friendly SaaS
   benefits from one-click OAuth.
2. **`commerce/stripe-checkout/`** — but in **subscription mode**, not
   one-time. The example covers both — read the "Subscription" section
   of its README. Use `mode: 'subscription'` and a `price_id` from
   Stripe.
3. **The actual domain feature** — whatever the SaaS does. This is
   where you stop copying examples and write custom code.
4. **`forms/contact-form/`** — sales/support contact form on the
   landing page. Quick win.
5. **`content/markdown-blog/`** — content marketing / changelog.
   Optional but high-leverage for SEO.

## What you'll build on top

Built on molecule packages — do NOT hand-roll these:

- **Plan gating** — use `@molecule/api-entitlements`, do NOT invent a
  `subscription_status` column or a `requirePlan` middleware. Register your
  tiers once with `setProvider({ tiers, defaultPlanKey })` (each keyed by
  `planKey`, with a `category` like `'free'`/`'pro'` + per-tier `limits`),
  then gate a route with `requireCategory('pro')` (Express middleware — 403s
  below the tier) and read the tier via `getEffectiveTier(res)`. It reads the
  framework's `users.planKey` / `users.planExpiresAt` (already on every user)
  through a per-process cache — no new columns.
- **Trial / expiry** — set `users.planExpiresAt`; the entitlements cache
  treats an expired plan as the default tier automatically, so there's no
  nightly "flip status" cron to write. If you DO need periodic work, use the
  DataStore (`updateMany(table, where, data)`) — NEVER raw `db.query` SQL;
  molecule handlers never touch SQL directly.
- **Customer portal** — link to Stripe's hosted billing portal
  (`getClient().billingPortal.sessions.create` — see
  `commerce/subscription-management/`). Don't rebuild this UI yourself.
- **Webhook handlers** — extend `stripe-checkout/`'s webhook with
  `customer.subscription.updated` / `.deleted`: write the new `users.planKey`
  (via `updateById`) and call `invalidateCachedPlanKey(userId)` so the gate
  reflects it immediately.

## Anti-patterns

- Do not invent `@molecule/api-billing` or `@molecule/api-saas`.
  Subscription billing is `api-payments-stripe` (charging) +
  `@molecule/api-entitlements` (plan gating on `users.planKey`).
- Do not store the plan mirror in a hand-rolled `subscription_status`
  column. The framework already has `users.planKey` / `planExpiresAt`
  and `api-entitlements` reads them — write the plan there so gating,
  the plan cache, and the UI all agree.
- Do not store the source-of-truth subscription status only in your
  database. Stripe is authoritative — webhooks update your mirror.
- Do not roll your own dunning emails. Stripe sends them; configure
  in dashboard.
- Do not build a "free tier" before paid; it's much harder to retire
  a free tier than to add one.

## Required env

Sum of all linked examples' env, plus:

```
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Verify

End-to-end: visitor lands on pricing page → clicks Pro → completes
Stripe Checkout → webhook fires → sets `users.planKey='stripeMonthly'`
(+ `invalidateCachedPlanKey`) → `requireCategory('pro')` now lets the
user into the gated feature → user opens billing portal → cancels →
webhook fires → `planKey` back to `'free'` → access blocked next request.
