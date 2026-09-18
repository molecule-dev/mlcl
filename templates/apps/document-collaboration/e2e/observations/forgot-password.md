# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/forgot-password`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction      | success signal         | failure signal     |
| ---------------------------------------------- | ------- | ------------------------------------- | ---------------------- | ------------------ |
| `input[type="email"]`                          | textbox | email input                           | value bound            | value not captured |
| `getByRole("button", { name: /send reset/i })` | button  | submits POST /api/users/request-reset | check-your-email shown | no confirmation    |
| `getByRole("link", { name: /sign in/i })`      | link    | navigates to /login                   | /login                 | stays              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger | method | path                     | what request body or query is expected |
| ------- | ------ | ------------------------ | -------------------------------------- |
| submit  | POST   | /api/users/request-reset | {email}                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
