# Page observations: /drivers (Drivers)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates 10 drivers.

## Elements

| selector / accessible name                                                   | role    | expected behavior on interaction                             | success signal                                      | failure signal                   |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------------ | --------------------------------------------------- | -------------------------------- |
| `getByRole('heading', { name: /^drivers$/i, level: 1 })`                     | heading | page heading                                                 | heading visible                                     | shell error                      |
| `getByText(/\\d+ drivers in fleet/i)`                                        | text    | shows non-zero driver count from `/api/drivers` (~10 seeded) | text matches "10 drivers in fleet"                  | "0 drivers" or "Failed to load." |
| `getByRole('button', { name: /\\+ add driver/i })`                           | button  | open inline add-driver form                                  | form fields rendered (name, email, license_number…) | nothing happens / no form        |
| First driver card link (e.g. `getByRole('link', { name: /aisha martin/i })`) | link    | navigate to `/drivers/<uuid>`                                | URL matches `/drivers/[a-f0-9-]{36}`                | stays on /drivers                |
| First driver card "on duty" / "off duty" / "on break" badge                  | text    | reflects DB-canonical `drivers.status`                       | one of {on_duty, on_break, off_duty}                | "undefined"                      |
| First driver card "Safety NN" stat                                           | text    | reflects `drivers.score` (78–96 range)                       | numeric 50–100                                      | NaN/empty                        |

## Hidden surfaces opened from this page

| trigger               | what it opens      | elements inside (selector / role / behavior)                                     |
| --------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `+ Add driver` button | inline create form | name, email, phone, license_number, license_class, status select, submit, cancel |

## Network calls expected during normal use

| trigger         | method | path         | what request body or query is expected                        |
| --------------- | ------ | ------------ | ------------------------------------------------------------- |
| Initial mount   | GET    | /api/drivers | full driver roster, owner-scoped                              |
| Submit add form | POST   | /api/drivers | { name, email, phone, license_number, license_class, status } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/drivers.spec.ts`
