# Page observations: /pricing (Pricing)

> Public pricing comparison rendered from
> `@molecule/app-billing-react`'s `<PricingPage />`. Reads tier
> definitions + Stripe price IDs from `GET /api/billing/tiers`. Free
> tier shows "Current plan" (when authenticated and on free), paid tiers
> render an "Upgrade to …" CTA that POSTs to /api/billing/checkout and
> opens a real Stripe Checkout session.

## Page state assumed

- [x] Public OR authenticated (different CTAs render based on auth state)

## Elements

| selector / accessible name                                 | role            | expected behavior on interaction                        | success signal                                                                       | failure signal            |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| `getByRole('heading', { name: /Choose your Remit plan/ })` | heading         | static title                                            | visible                                                                              | missing                   |
| `getByText('Free')` (tier card)                            | text            | shows free tier                                         | rendered with $0 / mo                                                                | missing                   |
| `getByText('Pro')` (tier card)                             | text            | shows pro tier with monthly/yearly price from registry  | rendered, prices > $0                                                                | missing                   |
| `getByText('Team')` (tier card)                            | text            | shows team tier with prices                             | rendered                                                                             | missing                   |
| `getByRole('button', { name: /Upgrade to Pro/ })`          | button (authed) | POSTs `/api/billing/checkout` and opens Stripe Checkout | navigation to `checkout.stripe.com` OR response body has `url` containing `cs_test_` | 4xx response, no redirect |
| `getByRole('button', { name: /Upgrade to Team/ })`         | button (authed) | POSTs `/api/billing/checkout` for team plan             | as above                                                                             | as above                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger              | method | path                  | what request body or query is expected                               |
| -------------------- | ------ | --------------------- | -------------------------------------------------------------------- |
| initial mount        | GET    | /api/billing/tiers    | array of tiers with prices + limits                                  |
| Upgrade to Pro click | POST   | /api/billing/checkout | `{ priceId }`; 200 with `{ url: 'https://checkout.stripe.com/...' }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
