# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role      | expected behavior on interaction           | success signal                | failure signal      |
| ------------------------------------------------- | --------- | ------------------------------------------ | ----------------------------- | ------------------- |
| `[data-test=settings-page]` shell                 | container | page wrapper                               | rendered                      | empty               |
| `[data-test=settings-name]` name input            | textbox   | edits display name                         | value reflects typing         | input not focusable |
| `[data-test=settings-email]` email input          | textbox   | readonly                                   | reflects user.email           | mismatch            |
| `[data-test=settings-toggle-email_alerts]` switch | switch    | toggles email_alerts pref                  | aria-checked flips            | unchanged           |
| `[data-test=settings-currency-EUR]` currency chip | button    | sets currency to EUR                       | chip becomes active           | unchanged           |
| `[data-test=settings-save]` save button           | button    | PATCH /api/users/:id with name + oauthData | "Saved" badge briefly shown   | "Try again"         |
| "Manage plan" link                                | link      | navigates to /settings/billing             | URL becomes /settings/billing | dead link           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| page load | GET    | /api/users/:id | none                                   |
| save      | PATCH  | /api/users/:id | name, oauthData                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
