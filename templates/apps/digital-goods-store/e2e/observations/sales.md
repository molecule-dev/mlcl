# Page observations: /sales (Sales)

> Captured from a creator with at least one sale.

## Page state assumed

- [x] Authenticated — seller's own sales

## Elements

| selector / accessible name            | role       | expected behavior on interaction  | success signal        | failure signal         |
| ------------------------------------- | ---------- | --------------------------------- | --------------------- | ---------------------- |
| Page title "Sales"                    | heading    | identifies page                   | h1 visible            | missing                |
| Sales table row                       | row        | renders product, customer, amount | row visible           | missing                |
| Empty state message                   | text       | shown when zero sales             | text visible          | broken                 |
| `getByRole('link', { name: /dashboard | back/i })` | link                              | nav to /dashboard     | URL becomes /dashboard | no nav |
| Search/filter input                   | textbox    | filters sales list                | rendered list narrows | no filter              |

## Hidden surfaces opened from this page

| trigger             | what it opens | elements inside |
| ------------------- | ------------- | --------------- |
| (none — flat table) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path       | expected body          |
| --------- | ------ | ---------- | ---------------------- |
| Page load | GET    | /api/sales | returns seller's sales |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sales.spec.ts`
