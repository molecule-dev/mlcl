# Page observations: /starred (Starred)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction                               | success signal                 | failure signal                      |
| -------------------------- | ------ | -------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| Starred email list         | list   | renders rows where is_starred=true (GET /api/emails?starred=1) | starred rows displayed         | empty list when starred items exist |
| Sidebar Starred nav link   | link   | navigates to /starred, becomes active                          | aria-current/active on Starred | other folder appears active         |
| Star toggle on a row       | button | PUT /api/emails/:id/star to remove from starred                | row leaves the starred list    | row remains starred                 |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| Selecting a row | reading pane  | subject, body, archive/delete/spam buttons   |

## Network calls expected during normal use

| trigger | method | path                  | what request body or query is expected |
| ------- | ------ | --------------------- | -------------------------------------- |
| Mount   | GET    | /api/emails?starred=1 | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/starred.spec.ts`
