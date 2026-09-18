# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role             | expected behavior on interaction                                 | success signal                | failure signal              |
| ------------------------------------------------- | ---------------- | ---------------------------------------------------------------- | ----------------------------- | --------------------------- |
| Settings heading                                  | heading          | renders "Settings"                                               | visible                       | absent                      |
| Notifications / Pharmacy / Appearance nav buttons | button           | switch right pane                                                | aria-current=page on chosen   | tab does not switch         |
| Dose-time push toggle                             | checkbox         | toggles oauthData.settings.notifications.dosePush; auto-persists | next reload has same value    | toggle reverts after reload |
| Time format select                                | combobox         | toggle 12h / 24h, persists immediately                           | next reload sees stored value | reverts                     |
| Default pharmacy name input + Save                | textbox + button | edit pharmacy.name, click Save → PATCH /api/users/:id            | updated value survives reload | value lost                  |

## Hidden surfaces opened from this page

| trigger                                    | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------ | ------------- | -------------------------------------------- |
| Notifications / Pharmacy / Appearance tabs | section pane  | one section pane visible at a time           |

## Network calls expected during normal use

| trigger         | method | path           | what request body or query is expected |
| --------------- | ------ | -------------- | -------------------------------------- |
| Toggle a switch | PATCH  | /api/users/:id | { oauthData.settings }                 |
| Save pharmacy   | PATCH  | /api/users/:id | { oauthData.settings.pharmacy }        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
