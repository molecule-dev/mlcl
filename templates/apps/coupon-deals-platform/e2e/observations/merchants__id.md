# Page observations: /merchants/:id (MerchantDetail)

> Captured authenticated. Merchant profile + their active deals + side rail with contact and hours.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction    | success signal              | failure signal  |
| ----------------------------------------------------------- | ------- | ----------------------------------- | --------------------------- | --------------- |
| `getByRole('link', { name: /all merchants/i })`             | link    | nav back to /merchants              | URL becomes `/merchants`    | stays on detail |
| `page.getByRole('heading', { level: 1 }).first()`           | heading | renders merchant name               | visible                     | missing         |
| `getByRole('heading', { name: /active deals/i, level: 2 })` | heading | renders the active-deals section    | visible                     | missing         |
| `page.locator('a[href^="/deals/"]').first()`                | link    | nav to one of the merchant's deals  | URL becomes `/deals/<uuid>` | no nav          |
| `getByRole('heading', { name: 'Contact', level: 2 })`       | heading | renders the contact info side rail  | visible                     | missing         |
| `getByRole('heading', { name: 'Hours', level: 2 })`         | heading | renders the opening-hours side rail | visible                     | missing         |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside |
| ---------------------------------- | ------------- | --------------- |
| (none — page is read-only profile) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                       | expected body               |
| --------- | ------ | -------------------------- | --------------------------- |
| Page load | GET    | /api/merchants/:id         | merchant object             |
| Page load | GET    | /api/deals?merchant_id=:id | the merchant's active deals |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/merchants__id.spec.ts`
