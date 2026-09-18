# Page observations: /invoices

> Filled by AI agent driving the running smoke app on 3010/4010 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/invoices.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/invoices`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/invoices.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role      | expected behavior on interaction | success signal         | failure signal           |
| --------------------------------------------------- | --------- | -------------------------------- | ---------------------- | ------------------------ |
| `getByRole("heading", {name:/invoices/i, level:1})` | heading   | static — display only            | visible                | missing                  |
| `getByRole("link", {name:/new invoice/i})`          | link      | navigates to /invoices/new       | URL changes            | stays on /invoices       |
| status filter chips (All/Draft/Sent/Paid/Overdue)   | button    | filter list by status            | visible rows reduced   | no effect                |
| `getByRole("searchbox")` (search)                   | searchbox | filters by number or customer    | visible rows reduced   | no effect                |
| invoice row link (number)                           | link      | navigates to /invoices/:id       | URL changes to detail  | stays on /invoices       |
| summary KPI cards (Outstanding/Paid/Overdue)        | text      | derived from invoice list        | totals reflect rows    | all $0 with rows present |
| empty-state when zero invoices                      | text      | static — display only            | visible for fresh user | replaced by rows         |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path          | what request body or query is expected |
| ------------- | ------ | ------------- | -------------------------------------- |
| initial mount | GET    | /api/invoices | (authenticated)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices.spec.ts`
