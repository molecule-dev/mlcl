# Page observations: /pricing

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/pricing`.
> Public pricing page rendered by `@molecule/app-billing-react` `<PricingPage>`.

## Page state assumed

- [x] Public (no auth required); upgrade requires login

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                                                           | success signal                      | failure signal               |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------ | ----------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /Choose your.*plan/i })` | heading | page heading rendered with APP_NAME                                                        | h1 visible with `Refract`           | missing                      |
| Free tier card                                         | section | renders with `0` price and free-tier limits                                                | "Free" + "$0" visible               | tier missing                 |
| Pro tier card                                          | section | renders with monthly price + limits list (reviews/webhooks/advanced/export)                | "Pro" visible with price + limits   | tier missing                 |
| Team tier card                                         | section | renders with monthly price + limits list                                                   | "Team" visible with price + limits  | tier missing                 |
| Upgrade button (Pro)                                   | button  | when authed, POSTs `/api/billing/checkout` with priceId; redirects to Stripe Checkout      | URL becomes `cs_test_*` Stripe page | nothing happens, no redirect |
| Upgrade button (Team)                                  | button  | when authed, POSTs `/api/billing/checkout` with Team priceId; redirects to Stripe Checkout | URL becomes `cs_test_*` Stripe page | nothing happens              |
| anonymous Upgrade attempt                              | n/a     | backend returns 401 (no session)                                                           | UI surfaces auth-required state     | silently swallowed           |
| invalid priceId checkout call                          | n/a     | backend returns 400 with validation error                                                  | structured error returned           | 200 returned with stub data  |

## Hidden surfaces opened from this page

| trigger | what it opens             | elements inside (selector / role / behavior) |
| ------- | ------------------------- | -------------------------------------------- |
| (none)  | pricing page is read-only | n/a                                          |

## Network calls expected during normal use

| trigger                | method | path                    | what request body or query is expected                                                      |
| ---------------------- | ------ | ----------------------- | ------------------------------------------------------------------------------------------- |
| initial load           | GET    | `/api/billing/tiers`    | returns `[{ key, name, prices: { monthly: { stripePriceId } } }, ...]` for Free/Pro/Team    |
| auth'd page load       | GET    | `/api/billing/status`   | returns `{ planKey: 'free'                                                                  | 'pro' | 'team', name }` |
| Upgrade click (auth'd) | POST   | `/api/billing/checkout` | `{ priceId, successUrl, cancelUrl }` → `{ checkoutUrl: 'https://checkout.stripe.com/...' }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms on this page)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
