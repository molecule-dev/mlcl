# Page observations: /forgot-password (ForgotPassword)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction                                                   | success signal                                        | failure signal |
| -------------------------------------------- | ------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| `input[type=email]` (Email)                  | textbox | accept email value                                                                 | typed value reflected                                 | input rejects  |
| `form button[type=submit]` (Send reset link) | button  | POST `/api/users/forgot-password`; show success state regardless of email validity | success copy "If <email> matches an account…" appears | error toast    |
| `a[href="/login"]` (Back to sign in)         | link    | navigate to /login                                                                 | URL becomes /login                                    | nav fails      |

## Hidden surfaces opened from this page

| trigger        | what it opens | elements inside (selector / role / behavior)   |
| -------------- | ------------- | ---------------------------------------------- |
| Submit success | Success card  | "Back to sign in" button (navigates to /login) |

## Network calls expected during normal use

| trigger               | method | path                       | what request body or query is expected          |
| --------------------- | ------ | -------------------------- | ----------------------------------------------- |
| Send reset link click | POST   | /api/users/forgot-password | `{ email }` always returns 200 (no enumeration) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
