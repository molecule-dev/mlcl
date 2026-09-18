# Page observations: /trash (Trash)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role   | expected behavior on interaction               | success signal                              | failure signal              |
| -------------------------------------------- | ------ | ---------------------------------------------- | ------------------------------------------- | --------------------------- |
| Trash thread list                            | list   | renders rows from GET /api/emails?folder=trash | rendered rows after deleting an email       | empty list after delete     |
| Sidebar Trash nav link                       | link   | navigates to /trash, becomes active            | aria-current/active on Trash                | other folder appears active |
| Reading-pane delete (DELETE /api/emails/:id) | button | trashes email                                  | DELETE call succeeds, row appears in /trash | row stays in inbox          |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| Selecting a row | reading pane  | subject, body, archive/delete/spam buttons   |

## Network calls expected during normal use

| trigger | method | path                     | what request body or query is expected |
| ------- | ------ | ------------------------ | -------------------------------------- |
| Mount   | GET    | /api/emails?folder=trash | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trash.spec.ts`
