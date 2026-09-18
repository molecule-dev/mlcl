# Page observations: /forgot-password (ForgotPassword)

> Filled from a live walk via Playwright MCP at /forgot-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction                                                               | success signal                                  | failure signal |
| --------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `input[type=email]` (Email address)                             | textbox | accept email value                                                                             | typed email reflected                           | input rejects  |
| `getByRole('button', { name: /send reset link/i })`             | button  | POST `/api/users/forgot-password`, swap form for success message regardless of email-existence | confirmation copy renders, no email enumeration | error toast    |
| `getByRole('link', { name: /back to sign in/i })` (href=/login) | link    | navigate to /login                                                                             | URL is /login                                   | nav fails      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger         | method | path                       | what request body or query is expected                                |
| --------------- | ------ | -------------------------- | --------------------------------------------------------------------- |
| Send Reset Link | POST   | /api/users/forgot-password | `{ email }` returns 200 with success message; never reveals existence |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
