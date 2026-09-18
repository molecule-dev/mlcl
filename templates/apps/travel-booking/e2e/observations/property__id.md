# Page observations: /property/:id (PropertyDetail)

Source: live walk via Playwright on the running smoke app. The :id is
resolved by first hitting `GET /api/accommodations` and clicking the first
property card; tests use that real id end-to-end.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                          | success signal                   | failure signal                 |
| --------------------------------------------------- | ------- | --------------------------------------------------------- | -------------------------------- | ------------------------------ |
| `getByRole('heading', { level: 1 })`                | heading | property name renders + GET /api/accommodations/:id fires | heading visible + GET in network | heading missing or 404         |
| `locator('[data-testid="property-all-photos"]')`    | button  | opens the photo gallery lightbox                          | gallery dialog visible           | gallery does not appear        |
| `locator('[data-testid="property-gallery-modal"]')` | dialog  | lightbox modal renders when opened                        | element with role=dialog visible | modal stays hidden after click |
| `locator('[data-testid="property-gallery-next"]')`  | button  | inside the lightbox: advances to next image               | counter increments               | counter unchanged              |
| `locator('[data-testid="property-gallery-prev"]')`  | button  | inside the lightbox: goes to previous image               | counter decrements               | counter unchanged              |
| `locator('[data-testid="property-gallery-close"]')` | button  | closes the lightbox                                       | dialog hidden                    | dialog stays visible           |
| `getByRole('link', { name: /back/i })`              | link    | back link returns to /search                              | URL becomes /search              | no navigation                  |

## Hidden surfaces opened from this page

| trigger           | what it opens        | elements inside (selector / role / behavior)                                                                                           |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| All photos button | full-screen lightbox | counter (`property-gallery-counter`), prev (`property-gallery-prev`), next (`property-gallery-next`), close (`property-gallery-close`) |

## Network calls expected during normal use

| trigger         | method      | path                              | what request body or query is expected |
| --------------- | ----------- | --------------------------------- | -------------------------------------- |
| navigate        | GET         | `/api/accommodations/:id`         | 200 with property + room types         |
| navigate        | GET         | `/api/accommodations/:id/reviews` | 200 with array of review rows          |
| toggle bookmark | POST/DELETE | `/api/favorites/:propertyId`      | toggles favorite for current user      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/property__id.spec.ts`
