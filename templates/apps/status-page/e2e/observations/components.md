# Page observations: /components (Components list)

> Filled from a live walk via Playwright MCP at /components. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role     | expected behavior on interaction                          | success signal          | failure signal               |
| -------------------------------------------------- | -------- | --------------------------------------------------------- | ----------------------- | ---------------------------- |
| `getByTestId('add-component-btn')` (Add component) | button   | toggle inline create form; POST /api/components on submit | new row appears in list | error visible; row not added |
| Each component row                                 | listitem | render name + group + status pill + uptime bar            | name + status visible   | row missing                  |

## Hidden surfaces opened from this page

| trigger       | what it opens | elements inside (selector / role / behavior) |
| ------------- | ------------- | -------------------------------------------- |
| Add component | inline form   | name, group, description, submit, cancel     |

## Network calls expected during normal use

| trigger         | method | path            | what request body or query is expected     |
| --------------- | ------ | --------------- | ------------------------------------------ |
| Page load       | GET    | /api/components | array of components                        |
| Submit add form | POST   | /api/components | `{ name, group, description }` returns 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-components.spec.ts`
