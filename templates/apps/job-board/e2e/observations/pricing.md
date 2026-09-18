# Page observations: /pricing (Pricing)

## Page state assumed

- [x] Public (browsable without auth)

## Elements

| selector / accessible name                         | role         | expected behavior on interaction | success signal | failure signal                                          |
| -------------------------------------------------- | ------------ | -------------------------------- | -------------- | ------------------------------------------------------- |
| Page heading `getByRole('heading')` first          | heading      | shows Pricing                    | rendered       | missing                                                 |
| Pro CTA `getByRole('button', { name: /upgrade.*pro | choose\s*pro | subscribe.*pro/i })` first       | button         | initiates POST /api/billing/checkout when authenticated | redirect to checkout.stripe.com or response with `url` | 4xx     |
| Tier listing `getByText(/free                      | pro          | team/i)` first                   | status         | tiers visible                                           | rendered                                               | missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger              | method | path                  | what request body or query is expected |
| -------------------- | ------ | --------------------- | -------------------------------------- |
| mount                | GET    | /api/billing/tiers    | tier registry payload                  |
| upgrade click (auth) | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
