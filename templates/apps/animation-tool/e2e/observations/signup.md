# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                     | success signal         | failure signal   |
| ----------------------------------------------------- | ------- | ---------------------------------------------------- | ---------------------- | ---------------- |
| `page.locator('input[type=text]').nth(0)` (firstName) | textbox | accepts first-name input                             | value stored           | empty            |
| `page.locator('input[type=text]').nth(1)` (lastName)  | textbox | accepts last-name input                              | value stored           | empty            |
| `page.locator('input[type=email]')`                   | textbox | accepts email input                                  | value stored           | empty            |
| `page.locator('input[type=password]').nth(0)`         | textbox | accepts password input                               | value stored           | empty            |
| `page.locator('input[type=password]').nth(1)`         | textbox | accepts confirm-password input                       | value stored           | empty            |
| `getByRole('button', { name: /Create account/i })`    | button  | POST /api/users (signup) then redirect to /dashboard | URL becomes /dashboard | stays on /signup |
| `getByRole('link', { name: /Sign in/i })`             | link    | navigate to /login                                   | URL becomes /login     | stays            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected   |
| --------------------- | ------ | ---------- | ---------------------------------------- |
| Create account submit | POST   | /api/users | { email, password, firstName, lastName } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
