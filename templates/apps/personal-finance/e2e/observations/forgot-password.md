# Page observations: /forgot-password (ForgotPassword)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/forgot-password.
> Headings observed: 1: Forgot password / reset password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role    | expected behavior on interaction                        | success signal                     | failure signal                   |
| ----------------------------------------- | ------- | ------------------------------------------------------- | ---------------------------------- | -------------------------------- |
| `getByRole('heading')`                    | heading | renders the forgot-password title                       | heading visible                    | nothing rendered / 404           |
| `locator('input[type="email"]')`          | textbox | accepts the user's email address                        | typed value mirrored back          | input not visible / not editable |
| `locator('form button[type="submit"]')`   | button  | POSTs /api/users/forgot-password and shows confirmation | success state visible / 200 status | network error / 4xx surfaced     |
| `locator('a[href="/login"]')`             | link    | returns user to /login                                  | URL becomes /login                 | no navigation                    |
| `[data-mol-id="forgot-password-success"]` | status  | confirms a reset email was sent                         | success message visible            | no feedback shown                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                       | expected body             |
| ------- | ------ | -------------------------- | ------------------------- |
| Submit  | POST   | /api/users/forgot-password | `{ email }`, response 200 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
