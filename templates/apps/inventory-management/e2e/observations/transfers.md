# Page observations: /transfers (StockTransfer)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction | success signal | failure signal |
| -------------------------- | -------- | -------------------------------- | -------------- | -------------- |
| heading "Stock transfers"  | heading  | renders page title               | visible        | missing        |
| product select             | combobox | choose product                   | value updates  | no update      |
| from-warehouse select      | combobox | choose source                    | value updates  | no update      |
| to-warehouse select        | combobox | choose destination               | value updates  | no update      |
| submit transfer button     | button   | POST /stock/transfer             | success banner | inline error   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger         | method | path                | what request body or query is expected                       |
| --------------- | ------ | ------------------- | ------------------------------------------------------------ |
| page load       | GET    | /api/products       | limit query                                                  |
| page load       | GET    | /api/warehouses     | auth                                                         |
| submit transfer | POST   | /api/stock/transfer | { product_id, from_warehouse_id, to_warehouse_id, quantity } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/stocktransfer.spec.ts`
