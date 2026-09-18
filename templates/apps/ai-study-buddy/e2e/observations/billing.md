# Page observations: /billing (Billing)

Captured via `node scripts/observe-page.mjs ai-study-buddy /billing --auth`.
Renders the user's current plan, pricing tiers, and a Stripe-Checkout
upgrade CTA. Powered by `@molecule/app-billing-react`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                                  | success signal                     | failure signal              |
| --------------------------------------------------------- | ------- | ----------------------------------------------------------------- | ---------------------------------- | --------------------------- |
| `getByRole('heading', { name: /current plan/i })`         | heading | renders current plan label (Free unless upgraded)                 | heading visible                    | heading missing             |
| `getByRole('heading', { name: /Free/ })` (Free tier card) | heading | renders the free pricing card from `/api/billing/tiers`           | card visible                       | card missing                |
| `getByRole('heading', { name: /Pro/ })`                   | heading | renders the Pro pricing card                                      | card visible                       | card missing                |
| `getByRole('heading', { name: /Team/ })`                  | heading | renders the Team pricing card                                     | card visible                       | card missing                |
| `getByRole('button', { name: /Upgrade to Pro/i })`        | button  | starts a Stripe Checkout session via POST `/api/billing/checkout` | redirects to `checkout.stripe.com` | stays on `/billing`, no nav |
| `[data-mol-id="pricing-cta-free"]`                        | button  | disabled — free tier has no `stripePriceId`                       | button is disabled                 | enabled (config bug)        |
| `getByRole('link', { name: 'Dashboard' })` (sidebar)      | link    | navigate to `/dashboard`                                          | URL becomes `/dashboard`           | stays                       |

## Hidden surfaces opened from this page

| trigger                                | what it opens                        | elements inside (selector / role / behavior) |
| -------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Click `Upgrade to Pro` while signed in | external Stripe Checkout in same tab | hosted Stripe form (out of scope)            |

## Network calls expected during normal use

| trigger                | method | path                    | what request body or query is expected               |
| ---------------------- | ------ | ----------------------- | ---------------------------------------------------- |
| page mount             | GET    | `/api/billing/tiers`    | returns `{ data: [tier...] }`                        |
| page mount             | GET    | `/api/billing/status`   | returns `{ planKey, planExpiresAt, planAutoRenews }` |
| `Upgrade to Pro` click | POST   | `/api/billing/checkout` | body `{ priceId: <stripePriceId> }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-billing.spec.ts`
