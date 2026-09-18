# Page observations: /location/:id (LocationDetail)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role    | expected behavior on interaction                                                | success signal                 | failure signal       |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------- | ------------------------------ | -------------------- |
| `getByRole('heading', { level: 1 })` | heading | render the location name                                                        | location name visible          | absent / placeholder |
| `main` (hero card with current temp) | section | render the current observation for this location via /api/forecasts/current/:id | shows "<temp>°" + condition    | placeholder/empty    |
| `main` (hourly strip)                | strip   | render the 24 next-hours forecast for this location                             | hour labels (12A/1A/…) visible | empty                |
| `main a[href="/locations"]`          | link    | back-arrow link returns to /locations                                           | URL becomes /locations         | unchanged            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | detail is flat                               |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| page load | GET    | /api/locations/:id         | (returns the location row)             |
| page load | GET    | /api/forecasts/current/:id | (current observation)                  |
| page load | GET    | /api/forecasts/hourly/:id  | (24 hourly entries)                    |
| page load | GET    | /api/forecasts/daily/:id   | (7 daily entries)                      |
| page load | GET    | /api/alerts/location/:id   | (active alerts for this location)      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/location__id.spec.ts`
