# Page observations: /deals (Deals)

> Captured authenticated. Renders a category-filtered grid of active deals.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                          | role     | expected behavior on interaction                                 | success signal                | failure signal    |
| --------------------------------------------------- | -------- | ---------------------------------------------------------------- | ----------------------------- | ----------------- |
| `getByRole('heading', { name: 'Deals', level: 1 })` | heading  | renders the page title                                           | visible                       | missing           |
| `getByRole('button', { name: 'All' })`              | button   | clears category filter, refetches /api/deals (no category param) | re-fetch fires                | no network call   |
| `getByRole('button', { name: 'Restaurants' })`      | button   | filters list by Restaurants category                             | re-fetch with `?category=...` | no filter applied |
| `getByRole('button', { name: 'Beauty' })`           | button   | filters list by Beauty category                                  | re-fetch with `?category=...` | no filter applied |
| `getByRole('button', { name: 'Fitness' })`          | button   | filters list by Fitness category                                 | re-fetch                      | no filter applied |
| `getByRole('button', { name: 'Activities' })`       | button   | filters list by Activities category                              | re-fetch                      | no filter applied |
| `getByRole('button', { name: 'Online' })`           | button   | filters list by Online category                                  | re-fetch                      | no filter applied |
| `getByRole('button', { name: 'Services' })`         | button   | filters list by Services category                                | re-fetch                      | no filter applied |
| `page.getByRole('listitem').first()`                | listitem | renders one of the deal cards                                    | ≥3 listitems                  | empty list        |
| `page.locator('a[href^="/deals/"]').first()`        | link     | nav to /deals/:id (each card is a link)                          | URL becomes `/deals/<uuid>`   | stays on `/deals` |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside |
| ---------------------------------- | ------------- | --------------- |
| (none — list and filters are flat) | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                     | expected body                   |
| ------------ | ------ | ------------------------ | ------------------------------- |
| Page load    | GET    | /api/deals               | array of decorated active deals |
| Filter click | GET    | /api/deals?category=<id> | filtered subset                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/deals.spec.ts`
