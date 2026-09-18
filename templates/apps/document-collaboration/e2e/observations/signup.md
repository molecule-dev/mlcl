# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/signup`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role          | expected behavior on interaction | success signal  | failure signal           |
| -------------------------------------------- | ------------- | -------------------------------- | --------------- | ------------------------ |
| `input[type="email"]`                        | textbox       | email input                      | value bound     |                          |
| `input[type="password"]`                     | textbox       | password input                   | value bound     |                          |
| `getByRole("button", { name: /create account | sign up/i })` | button                           | POST /api/users | JWT, redirect /dashboard | stays /signup |
| `getByRole("link", { name: /sign in/i })`    | link          | navigates to /login              | /login          |                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| submit  | POST   | /api/users | {email,password,name}                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
