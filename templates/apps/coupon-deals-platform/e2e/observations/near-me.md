# Page observations: /near-me (NearMe)

> Captured authenticated. Map placeholder + numbered list of deals
> sorted by distance — distances come from /api/nearby_deals.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                             | role     | expected behavior on interaction    | success signal              | failure signal |
| ------------------------------------------------------ | -------- | ----------------------------------- | --------------------------- | -------------- |
| `getByRole('heading', { name: /near me/i, level: 1 })` | heading  | renders the page title              | visible                     | missing        |
| `getByText(/deals within/i).first()`                   | text     | renders the radius subheading       | visible                     | missing        |
| `getByText(/interactive map/i).first()`                | text     | renders the map placeholder         | visible                     | missing        |
| `page.getByRole('listitem').first()`                   | listitem | renders one of the nearby-deal rows | ≥3 listitems                | empty list     |
| `page.locator('a[href^="/deals/"]').first()`           | link     | nav to the deal detail page         | URL becomes `/deals/<uuid>` | no nav         |
| `page.getByText(/km away/i).first()`                   | text     | renders the distance label per row  | visible per row             | missing        |

## Hidden surfaces opened from this page

| trigger                                      | what it opens | elements inside |
| -------------------------------------------- | ------------- | --------------- |
| (none — flat list under the map placeholder) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path              | expected body                                        |
| --------- | ------ | ----------------- | ---------------------------------------------------- |
| Page load | GET    | /api/nearby_deals | array of deals sorted by distance with `distance_km` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/near-me.spec.ts`
