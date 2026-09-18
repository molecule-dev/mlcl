# Page observations: /pricing (Pricing)

> Public PricingPage from @molecule/app-billing-react. Fetches /api/billing/tiers.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role            | expected behavior on interaction             | success signal                          | failure signal |
| -------------------------------------------------- | --------------- | -------------------------------------------- | --------------------------------------- | -------------- |
| `page.locator('header').getByRole('link').first()` | link            | nav back to landing                          | URL becomes /                           | stays          |
| `getByRole('link', { name: /open dashboard         | dashboard/i })` | link                                         | nav to /dashboard (or /login if unauth) | URL changes    | stays |
| `page.locator('section, article, ul li')`          | region          | renders 3 plan cards from /api/billing/tiers | ≥ 1 card visible                        | empty          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | expected body                  |
| --------- | ------ | ------------------ | ------------------------------ |
| Page load | GET    | /api/billing/tiers | tier list with prices + limits |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-pricing.spec.ts`
