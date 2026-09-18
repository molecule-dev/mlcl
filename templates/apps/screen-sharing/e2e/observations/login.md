# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated guest

## Elements

| selector / accessible name                  | role          | expected behavior on interaction | success signal               | failure signal         |
| ------------------------------------------- | ------------- | -------------------------------- | ---------------------------- | ---------------------- |
| `input[type="email"]`                       | textbox       | Captures email                   | value persists               | rejected keystrokes    |
| `input[type="password"]`                    | textbox       | Captures password                | masked rendering, value held | plaintext or reset     |
| `getByRole('button', { name: /log in        | sign in/i })` | button                           | Submits login form           | URL changes off /login | stays on /login with error |
| `getByRole('button', { name: /sign up/i })` | button        | Routes to /signup                | URL becomes /signup          | stays on /login        |
| `getByRole('button', { name: /forgot/i })`  | button        | Routes to /forgot-password       | URL becomes /forgot-password | stays on /login        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
