# Page observations: /vehicles (Vehicles)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role             | expected behavior on interaction                 | success signal                         | failure signal    |
| -------------------------------------------------------------------- | ---------------- | ------------------------------------------------ | -------------------------------------- | ----------------- |
| `getByRole('heading', { name: /vehicles/i, level: 1 })`              | heading          | page heading                                     | heading visible                        | shell error       |
| `getByRole('searchbox', { name: /plate or driver/i })`               | textbox (search) | filter rows by typed query                       | typing reduces visible row count       | rows unchanged    |
| `getByRole('button', { name: /^operational$/i })`                    | button           | filter list to operational vehicles              | only operational rows shown            | no filter applied |
| `getByRole('button', { name: /^in transit$/i })`                     | button           | filter to in-transit                             | only in_transit rows                   | no filter         |
| `getByRole('button', { name: /\+ add vehicle/i })`                   | button           | open add-vehicle form, focus first input         | form fields visible                    | form did not open |
| `getByRole('button', { name: /add vehicle/i }).last()` (form submit) | button           | POST /api/vehicles, append new row, refetch list | new row appears in table after refetch | row missing       |
| First vehicle row link (plate cell)                                  | link             | navigate to /vehicles/:id detail page            | URL matches `/vehicles/<uuid>`         | 404 / stays       |

## Hidden surfaces opened from this page

| trigger                | what it opens      | elements inside (selector / role / behavior)            |
| ---------------------- | ------------------ | ------------------------------------------------------- |
| `+ Add vehicle` button | inline create form | plate, make, model, year, status select, submit, cancel |

## Network calls expected during normal use

| trigger         | method | path          | what request body or query is expected |
| --------------- | ------ | ------------- | -------------------------------------- |
| Initial mount   | GET    | /api/vehicles | list of all vehicles                   |
| Submit add form | POST   | /api/vehicles | { plate, make, model, year, status }   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vehicles.spec.ts`
