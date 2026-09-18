# Page observations: /pricing (Pricing)

> Captured from public route — uses @molecule/app-billing-react PricingPage.

## Page state assumed

- [x] Public — anyone can view pricing

## Elements

| selector / accessible name | role    | expected behavior on interaction                          | success signal     | failure signal |
| -------------------------- | ------- | --------------------------------------------------------- | ------------------ | -------------- |
| Pricing heading            | heading | identifies the plan list                                  | h1/h2 visible      | missing        |
| Free plan card             | region  | renders Free tier features                                | card visible       | missing        |
| Pro plan card              | region  | renders Pro tier features + price                         | card visible       | missing        |
| Team plan card             | region  | renders Team tier features + price                        | card visible       | missing        |
| Upgrade button (Pro)       | button  | starts subscription checkout (POST /api/billing/checkout) | redirect to Stripe | inline error   |

## Hidden surfaces opened from this page

| trigger                    | what it opens      | elements inside     |
| -------------------------- | ------------------ | ------------------- |
| Period toggle (month/year) | swaps shown prices | year prices visible |

## Network calls expected during normal use

| trigger   | method | path               | expected body     |
| --------- | ------ | ------------------ | ----------------- |
| Page load | GET    | /api/billing/plans | returns plan list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
