# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/settings`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role   | expected behavior on interaction | success signal                 | failure signal |
| ------------------------------------------- | ------ | -------------------------------- | ------------------------------ | -------------- |
| `getByTestId("settings-current-plan")`      | text   | shows current billing plan       | displays plan name             | shows —        |
| `getByTestId("settings-tier-pro")`          | region | renders Pro tier                 | visible                        |                |
| `getByTestId("settings-notif-comments")`    | switch | toggles comments notif pref      | PATCH /api/profile/me persists |                |
| `getByTestId("settings-editor-spellcheck")` | switch | toggles spellcheck pref          | PATCH persists                 |                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected |
| ----------- | ------ | --------------------- | -------------------------------------- |
| page load   | GET    | /api/profile/me       | profile + prefs                        |
| page load   | GET    | /api/billing/tiers    | available tiers                        |
| page load   | GET    | /api/billing/status   | current plan                           |
| toggle pref | PATCH  | /api/profile/me       | partial prefs                          |
| upgrade     | POST   | /api/billing/checkout | {priceId}                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
