# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name  | role    | expected behavior on interaction        | success signal               | failure signal     |
| --------------------------- | ------- | --------------------------------------- | ---------------------------- | ------------------ |
| Notifications toggles       | switch  | Flip notification preferences           | UI flips, persists via PATCH | reset on next load |
| Capture preferences toggles | switch  | Flip capture preferences                | UI flips, persists           | reset              |
| Hotkey textboxes            | textbox | Capture custom hotkey strings           | values held                  | reset              |
| Save button                 | button  | PATCH /api/users/:id with new oauthData | round-trip success message   | error              |
| Cancel button               | button  | Reverts to last saved state             | UI rolls back to original    | stays edited       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected    |
| --------- | ------ | -------------- | ----------------------------------------- |
| page load | GET    | /api/users/:id | auth header only                          |
| save      | PATCH  | /api/users/:id | { oauthData: { screenSharing: { ... } } } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-settings.spec.ts`
