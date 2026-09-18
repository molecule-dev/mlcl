# Page observations: /seller (SellerDashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role                   | expected behavior on interaction | success signal              | failure signal |
| ----------------------------------------------- | ---------------------- | -------------------------------- | --------------------------- | -------------- |
| `getByRole("heading", { name: /Seller dashboard | Seller/i, level: 1 })` | heading                          | render the seller dashboard | visible        | absent |
| `getByRole("link", { name: /New listing/i })`   | link                   | header CTA → /sell/new           | URL becomes /sell/new       | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /api/seller/stats    | (none)                                 |
| page load | GET    | /api/seller/listings | (none)                                 |
| page load | GET    | /api/seller/activity | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/seller.spec.ts`
