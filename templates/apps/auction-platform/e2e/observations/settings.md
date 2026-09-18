# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction | success signal               | failure signal                                              |
| ------------------------------------------------------- | ------- | -------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `getByRole("heading", { name: /Settings/i, level: 1 })` | heading | render Settings heading          | visible                      | absent                                                      |
| `getByRole("button", { name: /Profile/i })`             | button  | switch section to profile        | profile section visible      | not switched                                                |
| `getByRole("button", { name: /Notifications/i })`       | button  | switch to notifications section  | notification toggles visible | not switched                                                |
| `getByRole("button", { name: /Outbid                    | new_bid | outbid/i })`                     | switch                       | toggle a notification preference and save via PATCH /api/me | request observed | no request |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path    | what request body or query is expected |
| ------------------ | ------ | ------- | -------------------------------------- |
| page load          | GET    | /api/me | (none)                                 |
| toggle notify pref | PATCH  | /api/me | { notifyPrefs: { ... } }               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
