# Page observations: /dashboard (Dashboard)

> Captured from a creator with at least one product + one sale.

## Page state assumed

- [x] Authenticated — seller dashboard

## Elements

| selector / accessible name              | role              | expected behavior on interaction           | success signal       | failure signal            |
| --------------------------------------- | ----------------- | ------------------------------------------ | -------------------- | ------------------------- |
| Headline metrics tiles                  | region            | renders revenue/sales/downloads/conversion | tiles visible        | missing                   |
| Sparkline mini-chart                    | img               | renders 12-day revenue history             | svg present          | missing                   |
| Top products table                      | table             | renders top-revenue products               | rows visible         | empty when sold           |
| `getByRole('link', { name: /add product | new product/i })` | link                                       | nav to /products/new | URL becomes /products/new | no nav |
| `getByRole('link', { name: /sales       | view all/i })`    | link                                       | nav to /sales        | URL becomes /sales        | no nav |

## Hidden surfaces opened from this page

| trigger                                 | what it opens | elements inside |
| --------------------------------------- | ------------- | --------------- |
| (none — dashboard is read-only summary) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path           | expected body          |
| --------- | ------ | -------------- | ---------------------- |
| Page load | GET    | /api/analytics | returns metrics object |
| Page load | GET    | /api/sales     | returns recent sales   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
