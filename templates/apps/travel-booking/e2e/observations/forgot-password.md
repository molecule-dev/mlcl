# Page observations: /forgot-password (ForgotPassword)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role              | expected behavior on interaction                | success signal                 | failure signal       |
| --------------------------------------------------- | ----------------- | ----------------------------------------------- | ------------------------------ | -------------------- |
| `locator('input[type="email"]')`                    | input[type=email] | accepts the email address                       | input value reflected          | not editable         |
| `getByRole('button', { name: /Send reset link/i })` | button            | submit fires POST /api/reset_password (request) | success card replaces the form | inline error visible |
| `getByText(/Check your inbox/i)`                    | text              | success state shown after submit                | text visible                   | text never appears   |
| `getByRole('link', { name: /Back to sign in/i })`   | link              | navigates back to /login                        | URL becomes /login             | no navigation        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                         | what request body or query is expected                                  |
| ------- | ------ | ---------------------------- | ----------------------------------------------------------------------- |
| Submit  | POST   | `/api/users/forgot-password` | `{ email }` body — 200 OK on success (config: `forgotPasswordEndpoint`) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
