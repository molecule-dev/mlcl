# Page observations: /devices/:id (Device detail)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role               | expected behavior on interaction                    | success signal                                        | failure signal       |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------- | ----------------------------------------------------- | -------------------- |
| `page.locator('main')`                                   | region             | renders the meter name + live current_w + kwh_today | main area contains kWh and W text                     | 404 / blank page     |
| `page.locator('[data-mol-id="device-readings"]'), table` | table / list       | shows recent readings for this meter                | rows render OR explicit "no readings yet" empty state | silent blank space   |
| `getByRole('link', { name: /devices                      | back/i }).first()` | link                                                | navigates back to /devices                            | URL becomes /devices | URL unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger      | method | path                                | what request body or query is expected  |
| ------------ | ------ | ----------------------------------- | --------------------------------------- |
| initial load | GET    | /api/meters/:id                     | 200 → single meter object               |
| initial load | GET    | /api/readings?meter_id=:id&limit=24 | 200 → list of latest readings           |
| initial load | GET    | /api/meters/:id/tokens              | 200 → list of API tokens for that meter |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/devices_:id.spec.ts`
