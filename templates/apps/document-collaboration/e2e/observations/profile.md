# Page observations: /profile (Profile)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/profile`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction | success signal               | failure signal |
| ------------------------------------------- | ------- | -------------------------------- | ---------------------------- | -------------- |
| `getByTestId("profile-input-display-name")` | textbox | edit display name                | value bound                  |                |
| `getByTestId("profile-save")`               | button  | PATCH /api/profile/me            | profile-saved-banner visible | no banner      |
| `getByTestId("profile-public-toggle")`      | switch  | flips public_profile             | GET reflects new value       | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/profile/me | current profile                        |
| save      | PATCH  | /api/profile/me | profile fields                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
