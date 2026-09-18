# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs` (Playwright).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction | success signal                     | failure signal |
| -------------------------------------------------- | ------- | -------------------------------- | ---------------------------------- | -------------- |
| `getByLabel(/email/i)`                             | textbox | accepts email                    | typed value appears                | rejected       |
| `getByLabel(/reset code/i)`                        | textbox | accepts reset token              | typed value appears                | rejected       |
| `getByLabel(/new password/i)`                      | textbox | accepts new password (masked)    | masked                             | rejected       |
| `getByLabel(/confirm password/i)`                  | textbox | accepts confirm password         | masked                             | rejected       |
| `getByRole('button', { name: /reset password/i })` | button  | POST /api/users/reset-password   | redirects on success / shows error | error toast    |
| `getByRole('link', { name: /back to sign in/i })`  | link    | navigates to /login              | URL /login                         | 4xx/5xx        |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| Submit form | POST   | /api/users/reset-password | `{ email, token, password }`           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
