# Page observations: /dashboard (OrderDashboard)

> Authenticated — the operator's main kitchen board. Heading
> "Dashboard" / "Order board", four kanban columns (New / Preparing /
> Ready / Served), KPI tiles (Active orders, Ready, Avg ticket,
> Covers), and a "View history" link to /orders/history.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role | expected behavior on interaction                                             | success signal                                              | failure signal                 |
| -------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| four kanban columns ("New" / "Preparing" / "Ready" / "Served") | text | render the order lifecycle lanes from GET /api/orders                        | all four labels visible on the board                        | a column missing / mislabelled |
| KPI tiles (Active orders / Ready / Avg ticket / Covers)        | text | summarise live orders + revenue from the snapshot endpoint                   | tiles visible with numeric values (zero on a fresh account) | tiles missing or NaN           |
| "View history" link → /orders/history                          | link | nav to the historical orders page                                            | URL becomes /orders/history                                 | link missing / wrong target    |
| freshly-created pending order in the New column                | text | a POST /api/orders surfaces in the New / Pending lane within the live update | the new ticket id/text appears in New                       | ticket missing from board      |

## Hidden surfaces opened from this page

| trigger      | what it opens                                | elements inside                             |
| ------------ | -------------------------------------------- | ------------------------------------------- |
| order ticket | per-ticket detail modal / nav to /orders/:id | line items, status pill, pay/cancel actions |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-dashboard.spec.ts`
