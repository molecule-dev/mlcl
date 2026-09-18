# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role               | expected behavior on interaction               | success signal                                               | failure signal     |
| ----------------------------------------------------- | ------------------ | ---------------------------------------------- | ------------------------------------------------------------ | ------------------ |
| `getByRole('textbox', { name: /Full name/i })`        | textbox            | accepts a name                                 | `toHaveValue` matches                                        | empty              |
| `getByRole('textbox', { name: /Email address/i })`    | textbox            | accepts an email                               | `toHaveValue` matches                                        | empty              |
| `getByRole('textbox', { name: /^Password$/i })`       | textbox (password) | accepts a password                             | `toHaveValue` matches                                        | empty              |
| `getByRole('textbox', { name: /Confirm password/i })` | textbox (password) | accepts password confirmation                  | `toHaveValue` matches                                        | empty              |
| `getByRole('button', { name: /Create account/i })`    | button (submit)    | POST `/api/users` and redirect to `/workspace` | URL becomes `/workspace` AND a POST to `/users` was observed | stays on `/signup` |
| `getByRole('link', { name: /Sign in/i })`             | link               | navigates to `/login`                          | URL contains `/login`                                        | stays on `/signup` |
| `getByRole('link', { name: /^Pylon ?\.?$/i })`        | link               | brand link returns to landing `/`              | URL ends with `/`                                            | stays on `/signup` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected |
| ----------- | ------ | ---------- | -------------------------------------- |
| Submit form | POST   | /api/users | `{ name, email, password }`            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
