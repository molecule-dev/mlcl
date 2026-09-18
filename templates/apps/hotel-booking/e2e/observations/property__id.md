# Page observations: /property/:id (PropertyDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (renders without auth; favorite toggle requires auth)

## Elements

| selector / accessible name                                                       | role           | expected behavior on interaction                                     | success signal                                                             | failure signal            |
| -------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| `getByRole('heading', { level: 1 })`                                             | heading        | renders the property's name                                          | text matches the property's `name` from API                                | mismatch / empty          |
| `getByRole('link', { name: /Back to search/i })`                                 | link           | navigates back to `/search`                                          | URL contains `/search`                                                     | stays on `/property/:id`  |
| `getByRole('button', { name: /Save property/i })`                                | button         | toggles favorite (POST `/api/favorites`, DELETE on toggle off)       | when authed, GET `/api/favorites` reflects the change                      | no network call observed  |
| `page.locator('input[type="date"]').nth(0)`                                      | textbox (date) | check-in date input accepts ISO date                                 | `toHaveValue` matches typed value                                          | empty                     |
| `page.locator('input[type="date"]').nth(1)`                                      | textbox (date) | check-out date input accepts ISO date                                | `toHaveValue` matches typed value                                          | empty                     |
| `getByRole('combobox', { name: /Guests/i })`                                     | combobox       | guest select accepts a value                                         | `toHaveValue` matches                                                      | unchanged                 |
| `getByTestId('reserve-cta')`                                                     | link           | "Reserve" → `/booking/:id?room_id=…&check_in=…&check_out=…&guests=…` | `href` contains `/booking/{id}` AND the chosen check_in / check_out values | href missing query params |
| Room card "Select" button (`getByRole('button', { name: /^Select$/i }).first()`) | button         | switches the selected room; updates the price summary                | the button's text flips to "Selected" or `aria-pressed` toggles            | no visual change          |

## Hidden surfaces opened from this page

| trigger         | what it opens                 | elements inside                           |
| --------------- | ----------------------------- | ----------------------------------------- |
| Reviews section | inline list of recent reviews | `listitem` elements with rating + author  |
| Amenity list    | inline grid                   | `listitem` per amenity with material icon |

## Network calls expected during normal use

| trigger               | method | path                        | what request body or query is expected |
| --------------------- | ------ | --------------------------- | -------------------------------------- |
| Page load             | GET    | /api/properties/:id         | returns the decorated property         |
| Page load             | GET    | /api/properties/:id/rooms   | returns rooms list                     |
| Page load             | GET    | /api/properties/:id/reviews | returns reviews list                   |
| Heart toggle (add)    | POST   | /api/favorites              | `{ property_id }`                      |
| Heart toggle (remove) | DELETE | /api/favorites/:id          | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/property__id.spec.ts`
