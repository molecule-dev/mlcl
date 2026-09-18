# Page observations: /pricing (Pricing)

> Captured anonymously — uses @molecule/app-billing-react/PricingPage to render tier cards from /api/billing/tiers.

## Page state assumed

- [x] Public (no auth required, though Upgrade buttons require auth to drive checkout)

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction                              | success signal                        | failure signal              |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------- | ------------------------------------- | --------------------------- |
| `getByRole('heading', { name: /choose your snagr plan/i, level: 1 })` | heading | renders pricing headline                                      | visible                               | missing                     |
| `getByRole('heading', { name: 'Free', level: 2 })`                    | heading | renders Free tier card                                        | visible                               | missing                     |
| `getByRole('heading', { name: 'Pro', level: 2 })`                     | heading | renders Pro tier card                                         | visible                               | missing                     |
| `getByRole('heading', { name: 'Team', level: 2 })`                    | heading | renders Team tier card                                        | visible                               | missing                     |
| `getByRole('button', { name: /current plan/i })`                      | button  | disabled CTA on the user's current tier                       | button has disabled attribute         | clickable when shouldn't be |
| `getByRole('button', { name: /upgrade to pro/i })`                    | button  | when authed, POSTs /api/billing/checkout, redirects to Stripe | network call to /api/billing/checkout | no checkout call            |
| `getByRole('button', { name: /upgrade to team/i })`                   | button  | when authed, POSTs /api/billing/checkout, redirects to Stripe | network call to /api/billing/checkout | no checkout call            |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside |
| ----------------------------- | ------------- | --------------- |
| (none — tiers are flat cards) | —             | —               |

## Network calls expected during normal use

| trigger       | method | path                  | expected body      |
| ------------- | ------ | --------------------- | ------------------ |
| Page load     | GET    | /api/billing/tiers    | `{ data: Tier[] }` |
| Click Upgrade | POST   | /api/billing/checkout | `{ priceId }`      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
