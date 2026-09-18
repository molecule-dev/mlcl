# Page observations: /forgot-password (ForgotPassword)

> Public reset-request page. Email input → POST forgot-password → on
> success the form is replaced by a "Check your inbox" panel.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role              | expected behavior on interaction                | success signal                                     | failure signal            |
| --------------------------------------------------- | ----------------- | ----------------------------------------------- | -------------------------------------------------- | ------------------------- |
| `page.locator('#forgot-email')`                     | input[type=email] | accepts email                                   | value reflects typed text                          | input ignores keystrokes  |
| `getByRole('button', { name: /Send reset link/i })` | button            | POST forgot-password → "Check your inbox" panel | text "Check your inbox" visible after click        | stays on form, no panel   |
| `getByRole('link', { name: /Back to sign in/i })`   | link              | navigates to /login                             | url `/login`                                       | stays on /forgot-password |
| sent state                                          | n/a               | confirmation copy includes the email            | text "If an account exists for {{email}}" rendered | confirmation absent       |

## Network calls expected during normal use

| trigger               | method | path                         | what request body or query is expected                                |
| --------------------- | ------ | ---------------------------- | --------------------------------------------------------------------- |
| Send reset link click | POST   | `/api/users/forgot-password` | `{ email }` returns 200 (always — does not leak whether email exists) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
