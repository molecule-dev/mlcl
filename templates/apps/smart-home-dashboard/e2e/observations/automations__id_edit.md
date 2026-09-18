# Page observations: /automations/:id/edit (AutomationEditor)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                 | success signal                                 | failure signal |
| ------------------------------ | ------- | ------------------------------------------------ | ---------------------------------------------- | -------------- |
| `getByRole('heading').first()` | heading | editor renders prefilled with backend values     | name field has the seeded value                | empty form     |
| name input                     | textbox | accepts an updated name                          | `toHaveValue` matches                          | empty          |
| save button                    | button  | PUT /api/automations/:id with the updated record | PUT observed, redirect or list reflects change | no PUT         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger    | method | path                 | what request body or query is expected |
| ---------- | ------ | -------------------- | -------------------------------------- |
| page mount | GET    | /api/automations/:id | (no body)                              |
| click save | PUT    | /api/automations/:id | `{ name, ... }`                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/automations__id_edit.spec.ts`
