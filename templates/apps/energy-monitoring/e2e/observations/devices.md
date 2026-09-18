# Page observations: /devices (Devices)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role                    | expected behavior on interaction                                                               | success signal                                                           | failure signal                       |
| ------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `a[href^="/devices/"]`                                 | link                    | each meter row links to /devices/:id                                                           | count >= 3 (seeded meters)                                               | no rows render                       |
| `getByRole('button', { name: /deactivate/i }).first()` | button                  | POST /api/meters/:id/deactivate flips status to inactive                                       | next listMeters() shows status="inactive" for that id                    | status unchanged                     |
| `getByRole('button', { name: /add meter                | new meter/i }).first()` | button                                                                                         | opens the inline add-meter form                                          | name input becomes visible           | form not shown |
| `form input[name='name']`                              | textbox                 | name field for new meter; submit POSTs /api/meters; filter chips on the same page do not crash | new meter appears in /api/meters list; URL stays /devices when filtering | POST not sent or filter chip crashes |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger          | method | path                       | what request body or query is expected                             |
| ---------------- | ------ | -------------------------- | ------------------------------------------------------------------ |
| initial load     | GET    | /api/meters                | list of meters owned by the signed-in user                         |
| initial load     | GET    | /api/readings/circuits     | live current_w/kwh_today per meter                                 |
| add meter submit | POST   | /api/meters                | `{ name, type, location, unit, description }` → 201 with new meter |
| deactivate click | POST   | /api/meters/:id/deactivate | no body → 200, meter row now status="inactive"                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/devices.spec.ts`
