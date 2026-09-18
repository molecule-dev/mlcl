# Page observations: /compare (Side-by-side comparison)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                         | role    | expected behavior on interaction                                                   | success signal                              | failure signal              |
| ---------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------- |
| `getByRole('heading', { name: /where would you rather be/i })`                     | heading | render the page hero                                                               | visible                                     | absent                      |
| `main` (location card per saved location)                                          | section | render side-by-side cards with current temperature, condition, and 12-hour outlook | every saved location's name + temp visible  | only one card / cards empty |
| `main` (Activity verdicts row)                                                     | section | render derived verdicts (Running/Biking/Beach) per card                            | "RUNNING", "BIKING", "BEACH" labels visible | absent                      |
| `main` (12-hour strip per card)                                                    | strip   | render 12 hour labels per card                                                     | ≥12 hour labels visible across cards        | strip empty                 |
| `getByRole('link', { name: /manage locations/i })` (empty state when <2 locations) | link    | navigate to /locations                                                             | URL becomes /locations                      | stays on /compare           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | compare is flat — read-only comparison cards |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| page load | GET    | /api/locations             | (returns all saved locations)          |
| page load | GET    | /api/forecasts/current/:id | (one per location card)                |
| page load | GET    | /api/forecasts/hourly/:id  | (one per location card — 24 entries)   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/compare.spec.ts`
