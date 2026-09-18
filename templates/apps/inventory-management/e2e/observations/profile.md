# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                     | success signal          | failure signal |
| -------------------------- | -------- | ---------------------------------------------------- | ----------------------- | -------------- |
| name field                 | text     | renders signed-in user name                          | matches API             | mismatch       |
| email field                | text     | renders user.email                                   | matches API             | mismatch       |
| change-password link       | link     | navigates to /forgot-password                        | URL is /forgot-password | no navigation  |
| default warehouse selector | combobox | PATCH /users/:id with preferences.defaultWarehouseId | persists across reload  | reverts        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                  | method | path            | what request body or query is expected                 |
| ------------------------ | ------ | --------------- | ------------------------------------------------------ |
| page load                | GET    | /api/warehouses | auth                                                   |
| change default warehouse | PATCH  | /api/users/:id  | { oauthData: { preferences: { defaultWarehouseId } } } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
