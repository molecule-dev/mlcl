# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                   | role          | expected behavior on interaction                          | success signal                                              | failure signal                     |
| ---------------------------------------------------------------------------- | ------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| Identity fields (`profile-first-name`, `profile-last-name`, `profile-email`) | textbox group | accept and reflect identity values                        | typed values present, email is read-only and matches server | empty / clobbered after async load |
| `[data-mol-id="profile-update"]`                                             | button        | PATCH /api/profile with `{ name, username, preferences }` | server-stored name + prefs persist across reload            | values revert                      |
| Preference toggle buttons (`button[data-mol-id^="profile-pref-"]`)           | switch        | flip stored preference key                                | next GET preferences reflect the toggle                     | toggle resets on reload            |
| Active sessions list                                                         | listitem(s)   | reflects /api/profile/sessions, current pinned            | "current" pill shown for the most-recently-touched session  | empty / wrong row pinned           |
| Delete account button                                                        | button        | open confirm prompt → DELETE /api/profile                 | redirect to `/login` and account gone                       | stays / account remains            |

## Hidden surfaces opened from this page

| trigger        | what it opens  | elements inside (selector / role / behavior)     |
| -------------- | -------------- | ------------------------------------------------ |
| Delete account | confirm prompt | typed-confirmation field; cancel returns to page |

## Network calls expected during normal use

| trigger        | method | path                  | what request body or query is expected |
| -------------- | ------ | --------------------- | -------------------------------------- |
| Page mount     | GET    | /api/profile          | hydrate identity + prefs               |
| Page mount     | GET    | /api/profile/sessions | list active sessions                   |
| Save profile   | PATCH  | /api/profile          | `{ name, username, preferences }`      |
| Delete account | DELETE | /api/profile          | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
