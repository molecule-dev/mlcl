# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/forgot-password`
2. browser_snapshot — heading, email input, submit button, "Back to sign in" bottom link
3. After submit, page swaps to confirmation panel ("Check your inbox") — re-pass shows no new interactive surfaces

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                      | success signal                    | failure signal            |
| -------------------------------------------------- | ------- | ----------------------------------------------------- | --------------------------------- | ------------------------- |
| `[data-mol-id="forgot-form"]`                      | form    | submits to `POST /api/reset_password` (request reset) | swaps to "Check your inbox" panel | error alert shown         |
| `getByRole('textbox', { name: /Email/ })`          | textbox | accepts an email; required                            | input value reflects typed string | submit blocked when empty |
| `getByRole('button', { name: /Send reset link/ })` | button  | submits the form                                      | confirmation panel renders        | inline alert renders      |
| `getByRole('link', { name: /Back to sign in/ })`   | link    | navigates to `/login`                                 | URL becomes `/login`              | URL stays                 |

## Hidden surfaces opened from this page

| trigger        | what it opens                        | elements inside (selector / role / behavior)               |
| -------------- | ------------------------------------ | ---------------------------------------------------------- |
| submit success | "Check your inbox" panel             | `<h2>` "Check your inbox" + paragraph mentioning the email |
| submit failure | inline alert div with `role="alert"` | shows `requestError.message`                               |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| submit valid form | POST   | `/api/reset_password` | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
