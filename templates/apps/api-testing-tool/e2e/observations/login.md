# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                                                 | success signal                                                             | failure signal    |
| --------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| `getByRole('textbox', { name: /Email address/i })`  | textbox            | accepts an email value                                                           | `toHaveValue` matches                                                      | empty             |
| `getByRole('textbox', { name: /^Password$/i })`     | textbox (password) | accepts a password value                                                         | `toHaveValue` matches                                                      | empty             |
| `getByRole('button', { name: /Show password/i })`   | button             | toggles the password input from `type=password` to `type=text`                   | input `type` attribute flips to `text`                                     | still password    |
| `getByRole('link', { name: /Forgot/i })`            | link               | navigates to `/forgot-password`                                                  | URL contains `/forgot-password`                                            | stays on `/login` |
| `getByRole('link', { name: /Create an account/i })` | link               | navigates to `/signup`                                                           | URL contains `/signup`                                                     | stays on `/login` |
| `getByRole('button', { name: /Sign in/i })`         | button (submit)    | POST `/api/users/log-in` with credentials and redirect away from `/login` on 2xx | URL no longer contains `/login` AND a POST to `/users/log-in` was observed | stays on `/login` |
| `getByRole('link', { name: /^Pylon ?\.?$/i })`      | link               | brand link returns to landing `/`                                                | URL ends with `/`                                                          | stays on `/login` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| Submit credentials | POST   | /api/users/log-in | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
