# Page observations: /customers/:id

> Filled by AI agent driving the running smoke app on 3010/4010 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/customers__id.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/customers/:id`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/customers__id.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction        | success signal        | failure signal                      |
| -------------------------------------------------------- | ------- | --------------------------------------- | --------------------- | ----------------------------------- |
| customer profile heading (company)                       | heading | static — display only                   | shows company name    | shows "Customer record unavailable" |
| `getByRole("link", {name:/all customers/i})` (back link) | link    | navigates to /customers                 | URL changes           | stays on detail                     |
| Invoices tab                                             | tab     | shows seeded invoices for this customer | invoice rows visible  | empty state                         |
| Payments tab                                             | tab     | shows received payments                 | rows or "No payments" | broken render                       |
| Activity tab                                             | tab     | shows audit log                         | rows or empty state   | broken render                       |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                          | what request body or query is expected |
| ------------- | ------ | ----------------------------- | -------------------------------------- |
| initial mount | GET    | /api/customers/:id            | (authenticated)                        |
| initial mount | GET    | /api/invoices?customer_id=:id | (authenticated)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/customers__id.spec.ts`
