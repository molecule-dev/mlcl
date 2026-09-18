# Page observations: /pricing (Pricing)

Source: live walk via Playwright + e2e/pricing.spec.ts. Public
@molecule/app-billing-react PricingPage rendering the Free/Pro/Team
tiers from `/api/billing/tiers`. Authed Upgrade flips to a real Stripe
Checkout session.

## Page state assumed

- [x] Public (renders without auth) AND authenticated (Upgrade flow needs login)

## Elements

| selector / accessible name                                             | role     | expected behavior on interaction                                                                                                  | success signal                                                 | failure signal                                |
| ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| public render: heading + tier cards (Free/Pro/Team)                    | headings | page renders without auth, with at least one Free/Starter/Pro/Enterprise tier name                                                | heading + tier name visible                                    | empty page or 5xx                             |
| GET /api/billing/tiers returns Stripe-priced tiers                     | network  | `/api/billing/tiers` returns at least one tier with a `stripePriceId`                                                             | 200, `withStripe.length > 0`                                   | response has no real Stripe IDs               |
| `getByRole('button', { name: /upgrade\|subscribe\|choose\|select/i })` | button   | authed click triggers `POST /api/billing/checkout` and lands on a real Stripe checkout URL (`cs_test_…` or `checkout.stripe.com`) | response status < 400, URL contains `stripe.com` or `cs_test_` | 4xx, stays on `/pricing` with no checkout URL |

## Hidden surfaces opened from this page

| trigger        | what it opens                                                | elements inside (selector / role / behavior) |
| -------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Upgrade button | Stripe Checkout (external) — happens via redirect, not modal | n/a — external                               |

## Network calls expected during normal use

| trigger             | method | path                  | what request body or query is expected                                   |
| ------------------- | ------ | --------------------- | ------------------------------------------------------------------------ |
| initial load        | GET    | /api/billing/tiers    | 200 with `[{key, prices:[{stripePriceId,...}]}]`                         |
| Upgrade to Pro/Team | POST   | /api/billing/checkout | 200 with `{url:'https://checkout.stripe.com/…'}` (real cs_test_ session) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
