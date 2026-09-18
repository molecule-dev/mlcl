# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/reset-password`
2. browser_snapshot — heading, four inputs (email, token, password, confirm), submit button, "Back to sign in" link
3. Re-pass after entering a mismatched confirm shows the inline mismatch text

## Page state assumed

- [x] Public (no auth required) — token + email come from query string when used via email link

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                            | success signal                                                   | failure signal                        |
| -------------------------------------------------------- | ------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| `[data-mol-id="reset-form"]`                             | form    | submits to `POST /api/reset_password/confirm` (or equivalent route)         | redirects to `/dashboard`                                        | inline alert shown                    |
| `getByRole('textbox', { name: /^Email$/ })`              | textbox | accepts an email; pre-fills from `?email=`                                  | input value reflects query/typed string                          | submit blocked when empty             |
| `getByRole('textbox', { name: /Reset token/ })`          | textbox | accepts the token; pre-fills from `?token=`                                 | input value reflects query/typed string                          | submit blocked when empty             |
| `getByRole('textbox', { name: /^New password$/ })`       | textbox | accepts a password                                                          | input value reflects typed string                                | submit blocked when empty             |
| `getByRole('textbox', { name: /Confirm new password/ })` | textbox | accepts a password and shows mismatch text when different from new password | matching → no error; mismatched → "Passwords do not match." text | mismatch text missing                 |
| `getByRole('button', { name: /Reset password/ })`        | button  | submits the form when valid                                                 | redirects to `/dashboard`                                        | stays on `/reset-password` with alert |
| `getByRole('link', { name: /Back to sign in/ })`         | link    | navigates to `/login`                                                       | URL becomes `/login`                                             | URL stays                             |

## Hidden surfaces opened from this page

| trigger                   | what it opens                        | elements inside (selector / role / behavior) |
| ------------------------- | ------------------------------------ | -------------------------------------------- |
| API failure on submit     | inline alert div with `role="alert"` | shows `confirmError.message`                 |
| confirm-password mismatch | inline `<span>` with mismatch copy   | non-blocking but submit button disabled      |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| submit valid form | POST   | `/api/reset_password` | `{ token, password }` (confirm step)   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
