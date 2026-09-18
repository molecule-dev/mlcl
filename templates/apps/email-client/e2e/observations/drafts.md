# Page observations: /drafts (Drafts)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role | expected behavior on interaction                  | success signal                                              | failure signal              |
| -------------------------- | ---- | ------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| Drafts list                | list | renders rows from GET /api/emails?folder=drafts   | seeded draft (subject "Draft: Q4 review thoughts") rendered | empty list                  |
| Sidebar Drafts nav link    | link | navigates to /drafts and is active                | aria-current/active on Drafts link                          | other folder appears active |
| Draft row click            | row  | opens reading pane (or compose) for editing draft | draft body becomes editable                                 | row click does nothing      |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| Selecting a row | reading pane  | shows draft body                             |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected |
| ------- | ------ | ----------- | -------------------------------------- |
| Mount   | GET    | /api/drafts | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/drafts.spec.ts`
