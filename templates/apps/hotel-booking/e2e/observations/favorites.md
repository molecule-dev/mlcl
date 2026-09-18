# Page observations: /favorites (Favorites)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                                                                           | role         | expected behavior on interaction            | success signal                                        | failure signal    |
| ---------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------- | ----------------------------------------------------- | ----------------- |
| `getByRole('heading', { name: /Saved properties/i, level: 1 })`                                      | heading      | renders the page heading                    | heading is visible                                    | not visible       |
| `page.getByRole('article')`                                                                          | article list | each saved property renders as an article   | `count() >= 1` after a favorite is created            | empty page        |
| Property name heading inside an article (e.g. `getByRole('heading', { name: /Aoyama/i, level: 2 })`) | heading      | exposes the property name                   | heading is visible                                    | mismatch          |
| `getByRole('link', { name: /Aoyama                                                                   | Reykjavík    | Marrakech                                   | Casa                                                  | Mountain          | Villa/ }).first()` | link | each card title is a link to `/property/:id` | URL contains `/property/` after click | stays on `/favorites` |
| `getByRole('button', { name: /^Unsave$/i }).first()`                                                 | button       | DELETE `/api/favorites/:id`; row disappears | re-fetched `/api/favorites` no longer contains the id | row still present |

## Hidden surfaces opened from this page

| trigger      | what it opens    | elements inside                                              |
| ------------ | ---------------- | ------------------------------------------------------------ |
| No favorites | empty state card | `paragraph "No saved properties yet."` + `Browse stays` link |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| Page load | GET    | /api/favorites             | returns `{ data: [favorite…] }`        |
| Unsave    | DELETE | /api/favorites/:propertyId | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/favorites.spec.ts`
