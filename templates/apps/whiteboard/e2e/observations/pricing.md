# Page observations: /pricing (Pricing)

> Public plan-comparison page. Hydrates from `GET /api/billing/tiers`
> and renders one `<article data-mol-id="pricing-tier-{key}">` per
> returned tier. Each card has a heading, monthly-price line, a 5-row
> feature list (`boards`, `collaborators`, `elements`, `advanced
features`, `data export`), and a CTA — disabled "Current plan" for the
> active tier or "Upgrade to {Name}" for the others.

## Page state assumed

- [x] Public (no auth required) — but Upgrade CTAs require auth and route through `/api/billing/checkout`

## Elements

| selector / accessible name                          | role      | expected behavior on interaction                                                                                                              | success signal                                                                       | failure signal                         |
| --------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| pricing-tier cards rendered from /api/billing/tiers | composite | the page hydrates from GET /api/billing/tiers and renders ≥3 cards (`[data-mol-id^="pricing-tier-"]`) under the "Choose your Tessera plan" h1 | first `[data-mol-id^="pricing-tier-"]` visible + GET /api/billing/tiers returns <400 | 0 cards (API failed or wrong selector) |
| public reachability                                 | n/a       | a fresh, no-cookie browser sees the pricing page (no auth required)                                                                           | resp.status < 500 and URL still matches `/pricing`                                   | bounced / 5xx                          |
| `GET /api/billing/tiers` payload contract           | network   | API returns a non-empty array of tiers; first row has `key` and `name` populated                                                              | array length > 0 with truthy `key` + `name`                                          | empty / wrong shape                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected                            |
| ----------- | ------ | --------------------- | ----------------------------------------------------------------- |
| page load   | GET    | /api/billing/tiers    | 200 returns array of `{ key, name, monthlyPriceCents, features }` |
| Upgrade CTA | POST   | /api/billing/checkout | `{ priceId }`; 200 returns `{ url }` to Stripe Checkout           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
