# Page observations: /invoices/new

> Filled by AI agent driving the running smoke app on 3010/4010 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/invoices_new.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/invoices/new`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/invoices_new.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction    | success signal                          | failure signal          |
| ---------------------------------------------- | ------- | ----------------------------------- | --------------------------------------- | ----------------------- |
| Customer textbox                               | textbox | required text input — customer name | value retained                          | submit fails            |
| Issue date input                               | date    | required date — defaults to today   | value retained                          | submit fails            |
| Due date input                                 | date    | required date                       | value retained                          | submit fails            |
| Line item: description / quantity / unit price | textbox | number                              | editable line — totals recompute        | subtotal & total update | no recompute |
| "+ Add line" button                            | button  | appends an empty line row           | row count +1                            | no row added            |
| "×" remove line button                         | button  | removes the row when >1 exists      | row count -1                            | cannot remove last row  |
| Notes textarea                                 | textbox | free-form notes — optional          | value retained                          | no submit               |
| "Send invoice" button                          | button  | POST /api/invoices → /invoices      | redirect, new row in list with INV-NNNN | inline alert            |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected                                          |
| ----------- | ------ | ------------- | ------------------------------------------------------------------------------- |
| form submit | POST   | /api/invoices | {customer_id, customer_name, status, issue_date, due_date, line_items, totals…} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices_new.spec.ts`
