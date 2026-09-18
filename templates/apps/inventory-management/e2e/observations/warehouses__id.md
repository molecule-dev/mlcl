# Page observations: /warehouses/:id (WarehouseDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role      | expected behavior on interaction       | success signal    | failure signal |
| ------------------------------------------ | --------- | -------------------------------------- | ----------------- | -------------- |
| `getByTestId("warehouse-detail-name")`     | heading   | renders warehouse.name                 | matches API       | mismatch       |
| `getByTestId("warehouse-utilization-kpi")` | card      | renders %                              | visible           | missing        |
| `getByTestId("warehouse-skus-kpi")`        | card      | renders unique_products                | matches API       | mismatch       |
| `getByTestId("warehouse-units-kpi")`       | card      | renders total_items                    | matches API       | mismatch       |
| `getByTestId("warehouse-stock-row")`       | list-item | renders one row per stock_levels entry | count matches     | mismatch       |
| Move stock action                          | link      | navigates to /transfers                | URL is /transfers | no navigation  |
| Edit SKUs action                           | link      | navigates to /inventory                | URL is /inventory | no navigation  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected |
| --------- | ------ | ------------------- | -------------------------------------- |
| page load | GET    | /api/warehouses/:id | auth                                   |
| page load | GET    | /api/products       | limit query                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/warehouses__id.spec.ts`
