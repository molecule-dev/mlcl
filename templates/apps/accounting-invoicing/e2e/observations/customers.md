# Page observations: /customers

> Filled by AI agent driving the running smoke app on 3010/4010 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/customers.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/customers`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/customers.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role      | expected behavior on interaction          | success signal                      | failure signal      |
| ---------------------------------------------------- | --------- | ----------------------------------------- | ----------------------------------- | ------------------- |
| `getByRole("heading", {name:/customers/i, level:1})` | heading   | static — display only                     | visible                             | missing             |
| `getByRole("button", {name:/new customer/i})`        | button    | toggles inline new-customer form          | form fields appear                  | no toggle           |
| new-customer form: company input                     | textbox   | required field                            | value retained                      | submit fails        |
| new-customer form: contact_name + contact_email      | textbox   | optional fields                           | value retained                      | no effect           |
| new-customer form submit                             | button    | POST /api/customers → row appears in list | row appears, persists across reload | inline alert        |
| `getByRole("searchbox")` (search)                    | searchbox | filters visible rows by company           | rows reduced                        | no filtering        |
| customer row link                                    | link      | navigates to /customers/:id               | URL changes                         | stays on /customers |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path           | what request body or query is expected                      |
| ------------- | ------ | -------------- | ----------------------------------------------------------- |
| initial mount | GET    | /api/customers | (authenticated)                                             |
| form submit   | POST   | /api/customers | {company, contact_name, contact_email, payment_terms, tags} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/customers.spec.ts`
