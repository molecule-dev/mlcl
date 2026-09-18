---
name: subscription-management
intent: |
  - "Customer billing portal"
  - "Cancel / upgrade / downgrade subscription"
  - "Manage my plan"
  - "Change billing details"
  - "Pause subscription"
keywords: [subscription, billing, cancel, upgrade, downgrade, plan, portal]
---

# Subscription management (Stripe Customer Portal)

**When to copy this example:** the user wants subscribers to
self-serve plan changes — cancel, upgrade, swap card, view
invoices. Pairs with `commerce/stripe-checkout/` (start there).

## What you'll install

```bash
cd /workspace
# Already installed if you copied stripe-checkout:
# npm install @molecule/api-payments-stripe --workspace=api
```

## Files in this example

| Path                                          | What it does                                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/billing-portal.ts`              | `POST /billing/portal` creates a Stripe Customer Portal session and returns the URL; server-side gate checks the user owns this `stripe_customer_id`. |
| `app/components/ManageSubscriptionButton.tsx` | Button → POST → redirects to the portal URL.                                                                                                          |

## Anti-patterns

- Do not rebuild the cancel/upgrade/swap-card UI yourself. Stripe's
  hosted portal is free and handles every edge case (proration,
  3DS, dunning, cards-expiring-soon).
- Do not invent `@molecule/api-billing`. The composition is
  `api-payments-stripe` + your handler that calls
  `stripe.billingPortal.sessions.create`.
- Do not let users hit the portal endpoint for someone else's
  customer ID. Always look up `stripe_customer_id` from
  `res.locals.session.userId`.
- Do not assume the database is the source of truth for
  subscription status. Stripe is. Your DB is a webhook-driven
  mirror.

## Verify

User clicks "Manage subscription" → redirected to Stripe portal →
cancels → returns to your app → webhook
`customer.subscription.deleted` fires → DB reflects new status.
