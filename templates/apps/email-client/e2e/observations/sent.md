# Page observations: /sent (Sent)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role | expected behavior on interaction                | success signal                             | failure signal              |
| -------------------------- | ---- | ----------------------------------------------- | ------------------------------------------ | --------------------------- |
| Sent thread list           | list | renders rows from GET /api/emails?folder=sent   | rendered rows include freshly sent message | empty list after sending    |
| Sidebar Sent nav link      | link | renders Sent count + active state when selected | aria-current/active on Sent link           | other folder appears active |
| Thread row click           | row  | opens reading pane with sent message            | reading pane shows subject/body            | reading pane stays empty    |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| Selecting a row | reading pane  | subject, body, archive/delete/spam buttons   |

## Network calls expected during normal use

| trigger | method | path                    | what request body or query is expected |
| ------- | ------ | ----------------------- | -------------------------------------- |
| Mount   | GET    | /api/emails?folder=sent | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sent.spec.ts`
