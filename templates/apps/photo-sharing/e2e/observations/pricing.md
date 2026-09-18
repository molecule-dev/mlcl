# Page observations: /pricing (Pricing)

> Public/Authed — three pricing tier cards: Free, Pro, Team. Each card has
> a CTA button. Free shows "Current plan" (disabled if you're already free).
> Pro shows "Upgrade to Pro" → POST /api/billing/checkout → window.location
> to a real Stripe Checkout URL. Team shows "Upgrade to Team" likewise.

## Page state assumed

- [x] Public (no auth required) — but the upgrade CTA only fires once signed in

## Elements

| selector / accessible name                             | role      | expected behavior on interaction                  | success signal                   | failure signal      |
| ------------------------------------------------------ | --------- | ------------------------------------------------- | -------------------------------- | ------------------- |
| `getByRole('heading', { name: /choose your.*plan/i })` | heading   | identifies the page                               | heading visible                  | empty page          |
| `[data-mol-id="pricing-tier-free"]`                    | container | renders the Free tier card                        | card visible                     | tier missing        |
| `[data-mol-id="pricing-tier-pro"]`                     | container | renders the Pro tier card                         | card visible                     | tier missing        |
| `[data-mol-id="pricing-tier-team"]`                    | container | renders the Team tier card                        | card visible                     | tier missing        |
| `[data-mol-id^="pricing-cta-"]:not([disabled])`        | button    | upgrade CTA → window.location.assign(checkoutUrl) | navigates to checkout.stripe.com | stays + toast/error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected    |
| ----------------- | ------ | --------------------- | ----------------------------------------- |
| Page mount        | GET    | /api/billing/tiers    | `{ data: [{ key, prices: [...] }, ...] }` |
| Page mount (auth) | GET    | /api/billing/status   | `{ planKey, isFree, limits }`             |
| Click upgrade CTA | POST   | /api/billing/checkout | `{ priceId }` → `{ checkoutUrl }`         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
