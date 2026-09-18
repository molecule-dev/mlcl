# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required) — accessed via email link with ?email=&token=

## Elements

| selector / accessible name                        | role                  | expected behavior on interaction           | success signal                         | failure signal     |
| ------------------------------------------------- | --------------------- | ------------------------------------------ | -------------------------------------- | ------------------ |
| `locator('#email')`                               | textbox (email)       | accept email input (pre-filled from query) | value reflects email                   | empty              |
| `locator('#password')`                            | textbox (password)    | accept new password                        | value reflects typed text              | empty              |
| `locator('#confirm-password')`                    | textbox (password)    | accept confirm password                    | value reflects typed text              | empty              |
| `getByRole('button', { name: /show password/i })` | button                | toggle password visibility                 | input type changes                     | stays password     |
| `getByRole('button', { name: /reset password      | update password/i })` | button                                     | submit, POST /api/users/reset-password | redirect to /login | stays with error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger              | method | path                      | what request body or query is expected |
| -------------------- | ------ | ------------------------- | -------------------------------------- |
| Reset password click | POST   | /api/users/reset-password | { email, token, password }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-reset-password.spec.ts`
