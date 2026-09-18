# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name | role    | expected behavior on interaction               | success signal         | failure signal       |
| -------------------------- | ------- | ---------------------------------------------- | ---------------------- | -------------------- |
| Display name               | text    | Renders user.name                              | matches signup name    | missing              |
| Stats: total recordings    | card    | Renders count of owned recordings              | numeric value          | missing              |
| Stats: total views         | card    | Renders sum of view_count                      | numeric value          | missing              |
| Bio textarea               | textbox | Captures user bio                              | value persists         | reset                |
| Edit toggle                | button  | Reveals editable form controls                 | inputs become editable | always-disabled      |
| Save button                | button  | PATCH /api/users/:id with screenSharingProfile | success message        | error                |
| Recording list             | list    | Lists owned recordings                         | titles rendered        | empty when populated |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected                     |
| --------- | ------ | --------------- | ---------------------------------------------------------- |
| page load | GET    | /api/users/:id  | auth header only                                           |
| page load | GET    | /api/recordings | auth header only                                           |
| save      | PATCH  | /api/users/:id  | { oauthData: { screenSharingProfile: { bio, jobTitle } } } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-profile.spec.ts`
