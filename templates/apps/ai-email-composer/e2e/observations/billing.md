# Page observations: /billing (Billing)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/billing.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role   | expected behavior on interaction                                                         | success signal                                                 | failure signal               |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `[data-mol-id="billing-page"]`              | region | billing shell renders                                                                    | element visible                                                | absent                       |
| `[data-mol-id="billing-current-plan-name"]` | text   | current plan label visible (`Free` for a fresh signup)                                   | element contains plan label                                    | absent                       |
| `[data-mol-id="billing-plan-pro"]`          | region | Pro tier card visible in the plan grid                                                   | element visible                                                | missing                      |
| `[data-mol-id="billing-plan-pro-cta"]`      | button | clicking POSTs `/api/billing/checkout` and the response includes a Stripe Checkout `url` | response 200 with `{ url: "https://checkout.stripe.com/..." }` | response 4xx / no Stripe URL |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------- | ------------- | -------------------------------------------- |
| (none — plan grid is inline) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected |
| ----------- | ------ | --------------------- | -------------------------------------- |
| mount       | GET    | /api/billing/status   | (none)                                 |
| mount       | GET    | /api/billing/tiers    | (none)                                 |
| Upgrade Pro | POST   | /api/billing/checkout | `{ priceId }`                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
