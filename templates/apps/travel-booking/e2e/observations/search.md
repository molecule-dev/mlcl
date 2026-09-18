# Page observations: /search (Search)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction              | success signal             | failure signal  |
| ----------------------------------------------------- | ------- | --------------------------------------------- | -------------------------- | --------------- |
| `getByRole('heading', { level: 1 })`                  | heading | search hero heading visible                   | heading visible            | heading missing |
| `locator('select')`                                   | select  | sort selector switches result order           | option value updates       | not editable    |
| `getByText(/Sort by/i)`                               | text    | sort label visible next to the dropdown       | text visible               | text missing    |
| `getByRole('button').filter({ hasText: /Under         | Mid     | Luxe                                          | All/i }).first()`          | button          | clicking a price filter pill toggles its active state | button visually selected (class change) | no DOM change |
| `getByRole('button').filter({ hasText: /Plunge        | Hot     | Sea                                           | Pool                       | Mountain        | Aurora                                                | trails/i }).first()`                    | button        | clicking an amenity filter pill toggles its active state | button visually selected   | no DOM change |
| `getByRole('link').filter({ hasText: /Mexico          | Italy   | Faroe                                         | Argentina                  | Iceland         | France                                                | Mexico/i }).first()`                    | link          | clicking a property card navigates to /property/:id      | URL becomes /property/<id> | no navigation |
| `getByRole('button', { name: /per night/i }).first()` | button  | clicking a map pin navigates to /property/:id | URL becomes /property/<id> | no navigation   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger         | method      | path                         | what request body or query is expected |
| --------------- | ----------- | ---------------------------- | -------------------------------------- |
| navigate        | GET         | `/api/accommodations`        | 200 with array of property summaries   |
| toggle bookmark | POST/DELETE | `/api/favorites/:propertyId` | toggles favorite for current user      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
