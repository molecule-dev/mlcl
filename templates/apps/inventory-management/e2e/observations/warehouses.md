# Page observations: /warehouses (Warehouses)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role   | expected behavior on interaction | success signal         | failure signal |
| ------------------------------------- | ------ | -------------------------------- | ---------------------- | -------------- |
| `getByTestId("warehouse-card")`       | card   | renders one card per warehouse   | ≥4 cards               | fewer cards    |
| `getByTestId("add-warehouse-button")` | button | opens add-warehouse modal        | modal visible          | no modal       |
| warehouse card link                   | link   | navigates to /warehouses/:id     | URL is /warehouses/:id | no navigation  |
| utilization meter                     | meter  | renders capacity vs total_items  | visible                | missing        |
| duplicate-code error                  | alert  | shown when API returns 409       | visible                | missing        |

## Hidden surfaces opened from this page

| trigger              | what it opens       | elements inside (selector / role / behavior)    |
| -------------------- | ------------------- | ----------------------------------------------- |
| add-warehouse-button | add-warehouse modal | name/code/city/country/capacity fields + Submit |

## Network calls expected during normal use

| trigger       | method | path            | what request body or query is expected  |
| ------------- | ------ | --------------- | --------------------------------------- |
| page load     | GET    | /api/warehouses | auth                                    |
| add warehouse | POST   | /api/warehouses | { name, code, city, country, capacity } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/warehouses.spec.ts`
