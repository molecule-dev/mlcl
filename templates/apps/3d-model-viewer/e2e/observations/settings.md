# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role    | expected behavior on interaction           | success signal                                     | failure signal |
| ------------------------------------ | ------- | ------------------------------------------ | -------------------------------------------------- | -------------- |
| `[data-testid="profile-first-name"]` | textbox | accept new first name input                | input value updates                                | value empty    |
| `[data-testid="profile-last-name"]`  | textbox | accept new last name input                 | input value updates                                | value empty    |
| `[data-testid="profile-username"]`   | textbox | accept new username input                  | input value updates                                | value empty    |
| `[data-testid="profile-save"]`       | button  | PATCH /api/users/:id with the form payload | server-stored name/username persists across reload | values revert  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected  |
| ------------ | ------ | -------------- | --------------------------------------- |
| Save profile | PATCH  | /api/users/:id | { name, username? } JSON body           |
| Page mount   | GET    | /api/users/:id | hydrates form from current server state |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
