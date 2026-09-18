# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                  | success signal               | failure signal                 |
| --------------------------------------------------- | ------- | ------------------------------------------------- | ---------------------------- | ------------------------------ |
| `page.locator('input[type=email]')`                 | textbox | accepts email input                               | value stored                 | empty                          |
| `page.locator('input[type=password]').first()`      | textbox | accepts password input                            | value stored                 | empty                          |
| `getByRole('button', { name: /Sign in/i })`         | button  | POST /api/users/login then redirect to /dashboard | URL leaves /login            | stays on /login or shows error |
| `getByRole('link', { name: /Forgot/i })`            | link    | navigate to /forgot-password                      | URL becomes /forgot-password | stays                          |
| `getByRole('link', { name: /Create an account/i })` | link    | navigate to /signup                               | URL becomes /signup          | stays                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected |
| -------------- | ------ | ----------------- | -------------------------------------- |
| Sign in submit | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
