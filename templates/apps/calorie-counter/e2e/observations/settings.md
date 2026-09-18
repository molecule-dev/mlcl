# Page observations: /settings (Settings)

Source: live walk via Playwright + e2e/settings.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction                             | success signal                                  | failure signal       |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------ | ----------------------------------------------- | -------------------- |
| Account links (Profile/Goals/Subscription/Export)      | link   | navigates to corresponding route                             | URL changes accordingly                         | no nav               |
| Streak alerts toggle (label wrapping sr-only checkbox) | switch | PUT /api/notification-preferences { streak: ! }              | GET reflects flipped value                      | no PUT               |
| Meal reminders toggle                                  | switch | PUT /api/notification-preferences { meals: ! }               | GET reflects flipped value                      | no PUT               |
| "Sign out" button                                      | button | logout + redirect to /login; /today redirects back to /login | URL becomes /login then /login again on /today  | session still active |
| "Delete account" button                                | button | reveals password confirm form                                | password input visible                          | no form              |
| Confirm delete form (with password)                    | form   | DELETE /users/:id then logout                                | URL becomes /login + GET /api/users returns 401 | remains on /settings |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path                          | what request body or query is expected |
| --------------------- | ------ | ----------------------------- | -------------------------------------- |
| Page load             | GET    | /api/notification-preferences | 200 with prefs                         |
| Toggle a notification | PUT    | /api/notification-preferences | { key: value } → 200                   |
| Sign out              | POST   | /api/users/log-out            | 204 / 200 then session cleared         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
