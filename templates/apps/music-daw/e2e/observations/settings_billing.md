# Page observations: /settings/billing (Billing)

> Filled from a Playwright MCP walk of the live app. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                                                                                                                                                 | success signal                                     | failure signal       |
| ----------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------- |
| `getByRole('link', { name: /^Settings$/ })`                 | link    | back link → `/settings` (top-left arrow_back)                                                                                                                                    | URL = `/settings`                                  | broken               |
| `getByRole('heading', { name: /Subscription & billing/i })` | heading | page h1                                                                                                                                                                          | visible                                            | missing              |
| `[data-testid="current-plan"]`                              | text    | "Current plan: <name>" computed from GET `/api/billing/status`                                                                                                                   | shows real plan name from `tiers.ts`               | missing or "Unknown" |
| `[data-testid="plan-free"]`                                 | article | Free plan card with FREE eyebrow + monthly price + 3 highlights                                                                                                                  | visible                                            | missing              |
| `[data-testid="plan-pro"]`                                  | article | Pro plan card with monthly price + 4 highlights                                                                                                                                  | visible                                            | missing              |
| `[data-testid="plan-team"]`                                 | article | Team plan card with monthly price + 4 highlights                                                                                                                                 | visible                                            | missing              |
| `[data-testid="checkout-pro"]`                              | button  | POST `/api/billing/checkout` `{ priceId: <pro monthly stripePriceId> }`; on success either redirects to `https://checkout.stripe.com/...` (paid) or refreshes status (free swap) | URL contains `checkout.stripe.com` (or `cs_test_`) | no redirect / 4xx    |
| `[data-testid="checkout-team"]`                             | button  | POST `/api/billing/checkout` `{ priceId: <team monthly> }`; redirects to Stripe Checkout                                                                                         | URL contains `checkout.stripe.com`                 | no redirect          |
| `[data-testid="checkout-free"]`                             | button  | POST `/api/billing/checkout` `{ priceId: null }` → handler returns `{ updated: true }`, plan flips to free, status re-fetched                                                    | "Current plan: Free" updates inline                | no change            |
| current-plan disabled CTA                                   | button  | the cta for the current plan has `disabled` attribute and label "Current plan"                                                                                                   | disabled, no POST on click                         | enabled (regression) |
| error `role="alert"`                                        | alert   | shown when checkout returns `error` body or throws                                                                                                                               | red alert visible with copy                        | silent failure       |

## Hidden surfaces opened from this page

| trigger                   | what it opens                                                         | elements inside (selector / role / behavior) |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| (none on the page itself) | the modal is Stripe Checkout — opened on the next URL, not in our DOM | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path                    | what request body or query is expected                          |
| ------------- | ------ | ----------------------- | --------------------------------------------------------------- |
| initial load  | GET    | `/api/billing/tiers`    | tier list with `{ key, name, prices[], limits }`                |
| initial load  | GET    | `/api/billing/status`   | `{ planKey, category, name, isFree, limits }`                   |
| upgrade click | POST   | `/api/billing/checkout` | `{ priceId }`; returns `{ checkoutUrl }` or `{ updated: true }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (Stripe Checkout is external)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_billing.spec.ts`
