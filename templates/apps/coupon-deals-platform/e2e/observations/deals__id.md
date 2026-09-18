# Page observations: /deals/:id (DealDetail)

> Captured authenticated. Detail page for a single deal — main column has
> description + fine print, side rail has the redemption widget with a
> "Save coupon" button that POSTs /api/redemptions.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction                             | success signal                                    | failure signal  |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------------------------- | --------------- |
| `getByRole('link', { name: /all deals/i })`                     | link    | nav back to /deals                                           | URL becomes `/deals`                              | stays on detail |
| `page.getByRole('heading', { level: 1 }).first()`               | heading | renders the deal title                                       | visible                                           | missing         |
| `page.locator('a[href^="/merchants/"]').first()`                | link    | nav to the merchant detail page                              | URL becomes `/merchants/<uuid>`                   | stays on deal   |
| `getByRole('heading', { name: /about this deal/i, level: 2 })`  | heading | renders the "About this deal" section                        | visible                                           | missing         |
| `getByRole('heading', { name: /your coupon code/i, level: 2 })` | heading | renders the redemption widget heading                        | visible                                           | missing         |
| `getByRole('button', { name: /copy redemption code/i })`        | button  | copies the displayed code to the clipboard                   | clipboard contains the code                       | nothing happens |
| `getByRole('button', { name: /save coupon/i })`                 | button  | POSTs /api/redemptions, persists a saved coupon for the user | toast / state-flip + new entry in /api/my_coupons | no change       |

## Hidden surfaces opened from this page

| trigger                                     | what it opens | elements inside |
| ------------------------------------------- | ------------- | --------------- |
| (none — redemption widget is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger           | method | path             | expected body                                    |
| ----------------- | ------ | ---------------- | ------------------------------------------------ |
| Page load         | GET    | /api/deals/:id   | decorated deal                                   |
| Save coupon click | POST   | /api/redemptions | `{ deal_id }` → returns `{ redemptions: [...] }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/deals__id.spec.ts`
