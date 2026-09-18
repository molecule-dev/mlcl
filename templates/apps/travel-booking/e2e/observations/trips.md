# Page observations: /trips (Trips)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction          | success signal                   | failure signal         |
| --------------------------------------------------- | ------- | ----------------------------------------- | -------------------------------- | ---------------------- |
| `getByRole('heading', { name: /^Trips$/i })`        | heading | trips page renders + GET /api/trips fires | heading visible + GET in network | heading missing or 4xx |
| `getByText(/Your wanders/i)`                        | text    | eyebrow visible                           | text visible                     | text missing           |
| `getByRole('tab', { name: /Upcoming/i })`           | tab     | clicking selects the upcoming tab         | aria-selected=true               | does not change        |
| `getByRole('tab', { name: /Past/i })`               | tab     | clicking selects the past tab             | aria-selected=true               | does not change        |
| `getByRole('link', { name: /Plan another trip/i })` | link    | navigates to /search                      | URL becomes /search              | no navigation          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger  | method | path         | what request body or query is expected     |
| -------- | ------ | ------------ | ------------------------------------------ |
| navigate | GET    | `/api/trips` | 200 with array of trip rows (may be empty) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips.spec.ts`
