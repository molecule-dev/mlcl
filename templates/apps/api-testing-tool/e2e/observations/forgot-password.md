# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role            | expected behavior on interaction                                       | success signal                                                         | failure signal              |
| --------------------------------------------------- | --------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| `getByRole('textbox', { name: /Email address/i })`  | textbox         | accepts an email value                                                 | `toHaveValue` matches                                                  | empty                       |
| `getByRole('button', { name: /Send reset link/i })` | button (submit) | POST `/api/users/forgot-password` with `{ email }`; show success state | a POST to `/users/forgot-password` is observed AND its response is 2xx | stays on form, shows error  |
| `getByRole('link', { name: /Back to sign in/i })`   | link            | navigates to `/login`                                                  | URL contains `/login`                                                  | stays on `/forgot-password` |
| `getByRole('link', { name: /^Pylon ?\.?$/i })`      | link            | brand link returns to landing `/`                                      | URL ends with `/`                                                      | stays on `/forgot-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                       | what request body or query is expected |
| ------------ | ------ | -------------------------- | -------------------------------------- |
| Submit email | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
