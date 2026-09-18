# Page observations: /trips (Trips)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                                                                 | role      | expected behavior on interaction                                       | success signal                                      | failure signal                |
| ------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| `getByRole('heading', { name: /Your trips/i, level: 1 })`                                  | heading   | page heading rendered                                                  | heading is visible                                  | not visible                   |
| `getByRole('heading', { name: /^Upcoming$/i, level: 2 })`                                  | heading   | upcoming-section heading rendered                                      | heading is visible                                  | empty section heading missing |
| `page.locator('a[href^="/trips/"]')`                                                       | link list | every reservation row is a link to `/trips/:id`                        | `count() >= 1` after a reservation has been created | empty list                    |
| Trip card heading (e.g. `getByRole('heading', { name: /^The Aoyama Garden$/, level: 3 })`) | heading   | shows the property name on each trip card                              | heading is visible                                  | mismatch                      |
| Status pill (`getByText(/^upcoming$/i).first()`)                                           | text      | shows the status (`upcoming`, `in_progress`, `completed`, `cancelled`) | text appears on a row                               | absent                        |
| Empty-state link (`getByRole('link', { name: /Browse stays/i })`)                          | link      | only present when no trips exist; goes to `/search`                    | URL contains `/search`                              | URL stays on `/trips`         |

## Hidden surfaces opened from this page

| trigger      | what it opens    | elements inside                                 |
| ------------ | ---------------- | ----------------------------------------------- |
| No trips yet | empty state card | `paragraph "No trips yet"` + `Browse stays` CTA |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected          |
| --------- | ------ | ---------- | ----------------------------------------------- |
| Page load | GET    | /api/trips | returns `{ data: [trip…] }` for the authed user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips.spec.ts`
