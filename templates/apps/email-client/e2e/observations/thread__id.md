# Page observations: /thread/:id (ThreadView)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role    | expected behavior on interaction                               | success signal                                 | failure signal       |
| -------------------------------- | ------- | -------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| `[data-mol-id="thread-subject"]` | heading | renders the loaded thread subject                              | text matches the seeded email subject          | empty / placeholder  |
| `[data-mol-id="thread-back"]`    | link    | navigate back to /inbox                                        | URL becomes /inbox                             | stays on thread page |
| `[data-mol-id="thread-archive"]` | button  | PUT /api/emails/:id/move {folder:archive} then navigate /inbox | URL becomes /inbox + email present in /archive | nothing happens      |
| `[data-mol-id="thread-delete"]`  | button  | DELETE /api/emails/:id then navigate /inbox                    | URL becomes /inbox + email present in /trash   | row stays            |
| `[data-mol-id="thread-star"]`    | button  | PUT /api/emails/:id/star to flip is_starred                    | star icon flips + GET reflects new is_starred  | API not called       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path                   | what request body or query is expected |
| ----------- | ------ | ---------------------- | -------------------------------------- |
| Mount       | GET    | /api/emails/:id/thread | empty body                             |
| Archive     | PUT    | /api/emails/:id/move   | { folder: "archive" }                  |
| Delete      | DELETE | /api/emails/:id        | empty body                             |
| Star toggle | PUT    | /api/emails/:id/star   | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/thread__id.spec.ts`
