# Page observations: /billing (Plans + Stripe Checkout)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                                                     | success signal                                   | failure signal          |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------- |
| `getByRole('heading', { name: /plans, limits, and invoices/i })`  | heading | render the billing hero                                                              | visible                                          | absent                  |
| `main` (current-plan card)                                        | card    | render the user's current plan name + limits from /api/billing/status                | shows "Free" + max-locations/alerts/history      | placeholder / "—"       |
| `main` (3 tier cards)                                             | section | render Free / Pro / Team tiers from /api/billing/tiers                               | three cards with prices visible                  | fewer cards / hardcoded |
| `getByRole('button', { name: /upgrade/i }).first()` (Pro Monthly) | button  | POST /api/billing/checkout with the priceId; navigates to a real Stripe Checkout URL | URL contains `cs_test_` or `checkout.stripe.com` | stays on /billing       |
| `getByRole('button', { name: /upgrade/i }).nth(1)` (Pro Yearly)   | button  | POST /api/billing/checkout with the yearly priceId                                   | navigates to Stripe Checkout                     | stays on /billing       |
| `getByRole('button', { name: /upgrade/i }).nth(2)` (Team Monthly) | button  | POST /api/billing/checkout for the Team Monthly priceId                              | navigates to Stripe Checkout                     | stays on /billing       |
| `getByRole('button', { name: /upgrade/i }).nth(3)` (Team Yearly)  | button  | POST /api/billing/checkout for the Team Yearly priceId                               | navigates to Stripe Checkout                     | stays on /billing       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior)              |
| ------- | ------------- | --------------------------------------------------------- |
| (none)  | —             | billing is flat — every Upgrade is a real Stripe redirect |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected            |
| ------------- | ------ | --------------------- | ------------------------------------------------- |
| page load     | GET    | /api/billing/status   | (returns `{ planKey, name, limits }`)             |
| page load     | GET    | /api/billing/tiers    | (returns three tier definitions w/ stripePriceId) |
| Upgrade click | POST   | /api/billing/checkout | `{ priceId }` — server returns `{ checkoutUrl }`  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
