# Page observations: /search (SearchResults)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (renders without auth; favorite toggle requires auth)

## Elements

| selector / accessible name                                       | role      | expected behavior on interaction                                                                  | success signal                                                        | failure signal              |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| `getByRole('heading', { name: /Curated stays/i, level: 1 })`     | heading   | renders page header                                                                               | heading is visible                                                    | not visible                 |
| `page.locator('a[href^="/property/"]')`                          | link list | each card links to `/property/:id`                                                                | `count() > 2`                                                         | empty list                  |
| `getByRole('combobox', { name: /Sort by/i })`                    | combobox  | changing sort re-orders the result list (price asc, price desc, top rated)                        | first card's price changes after switching to "Price: low → high"     | order unchanged             |
| `getByRole('button', { name: /Under \$250/i })`                  | button    | clicking applies a price filter (subset of full list)                                             | visible card count is `<=` initial                                    | unchanged                   |
| `getByRole('button', { name: /^Pool$/ })`                        | button    | clicking adds a `Pool` amenity filter                                                             | visible cards all advertise Pool                                      | unchanged                   |
| `getByRole('button', { name: /Save property/i }).first()`        | button    | toggles a favorite for the first card; POST `/api/favorites` (anonymous → 401 silently swallowed) | when authed, GET `/api/favorites` shows the property in returned list | unchanged after auth toggle |
| Map pin button (e.g. `getByRole('button', { name: /Aoyama/i })`) | button    | clicking a price pin navigates to that property's detail page                                     | URL contains `/property/`                                             | URL unchanged               |

## Hidden surfaces opened from this page

| trigger                            | what it opens                    | elements inside                                                    |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| empty state (e.g. ?q=zzznoresults) | "No properties match" empty card | `paragraph "No stays match your filters"` + `button Clear filters` |

## Network calls expected during normal use

| trigger               | method | path               | what request body or query is expected |
| --------------------- | ------ | ------------------ | -------------------------------------- |
| Page load             | GET    | /api/properties    | returns `{ data: [property…] }`        |
| Page load (authed)    | GET    | /api/favorites     | returns `{ data: [favorite…] }`        |
| Heart toggle (add)    | POST   | /api/favorites     | `{ property_id }`                      |
| Heart toggle (remove) | DELETE | /api/favorites/:id | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
