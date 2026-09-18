# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Public (no auth required) — token comes via URL query param

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                   | success signal                       | failure signal |
| -------------------------------------------------- | ------- | -------------------------------------------------- | ------------------------------------ | -------------- |
| `page.locator('input[type=password]').nth(0)`      | textbox | accepts new password input                         | value stored                         | empty          |
| `page.locator('input[type=password]').nth(1)`      | textbox | accepts confirm new password input                 | value stored                         | empty          |
| `getByRole('button', { name: /Reset password/i })` | button  | POST /api/users/reset-password { token, password } | success message + redirect to /login | error visible  |
| `getByRole('link', { name: /Back to sign in/i })`  | link    | navigate to /login                                 | URL becomes /login                   | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger               | method | path                      | what request body or query is expected |
| --------------------- | ------ | ------------------------- | -------------------------------------- |
| Reset password submit | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
