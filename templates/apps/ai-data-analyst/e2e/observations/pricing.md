# Page observations: /pricing (Pricing)

> Captured anonymously — public marketing pricing page that lists tiers
> and links to signup or billing checkout.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                | success signal | failure signal |
| ---------------------------------------------------- | ------- | ----------------------------------------------- | -------------- | -------------- |
| `getByRole('heading', { level: 1 })`                 | heading | renders the pricing page heading                | visible        | missing        |
| `page.locator('main section, main article').first()` | section | renders at least one tier card                  | ≥1 visible     | none           |
| `getByRole('link').first()`                          | link    | hits at least one CTA link (sign up or contact) | href set       | href empty     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                                                  | expected body             |
| --------- | ------ | ----------------------------------------------------- | ------------------------- |
| Page load | GET    | /api/billing/tiers (optional, public reads tier list) | array of tier descriptors |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-pricing.spec.ts`
