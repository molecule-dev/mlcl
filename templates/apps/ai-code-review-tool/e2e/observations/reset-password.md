# Page observations: /reset-password

> Filled from a Playwright MCP walk of the live app at
> `http://localhost:3070/reset-password?token=...`. Public reset form
> provided by `@molecule/app-auth-default`.

## Page state assumed

- [x] Public (no auth required); token comes from query string `?token=`

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                                                             | success signal                                         | failure signal  |
| ------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------- |
| `getByRole('heading', { name: /^Refract$/ })`     | heading | brand heading                                                                                | visible                                                | missing         |
| `getByText(/Set a new password/)`                 | text    | sub-heading                                                                                  | visible                                                | missing         |
| `getByLabel(/NEW PASSWORD/i)`                     | textbox | new password input (type=password)                                                           | enterable                                              | not focusable   |
| `getByLabel(/CONFIRM PASSWORD/i)`                 | textbox | confirm-password input                                                                       | enterable                                              | not focusable   |
| `getByRole('button', { name: /Show password/ })`  | button  | toggles new password input type=text                                                         | input.type flips text↔password                         | nothing happens |
| `getByRole('button', { name: /Reset Password/ })` | button  | POST `/api/users/resetPassword` with `{ token, password }`; redirects to `/login` on success | URL becomes `/login` (or shows error if token invalid) | silent failure  |
| `getByRole('link', { name: /Back to Sign In/ })`  | link    | navigates to `/login`                                                                        | URL becomes `/login`                                   | stays on page   |

## Hidden surfaces opened from this page

| trigger | what it opens         | elements inside (selector / role / behavior) |
| ------- | --------------------- | -------------------------------------------- |
| (none)  | no menus on this page | n/a                                          |

## Network calls expected during normal use

| trigger                               | method | path                       | what request body or query is expected                   |
| ------------------------------------- | ------ | -------------------------- | -------------------------------------------------------- |
| Reset Password submit (valid token)   | POST   | `/api/users/resetPassword` | `{ token, password }`; backend returns 200 + new session |
| Reset Password submit (invalid token) | POST   | `/api/users/resetPassword` | backend returns 400/401; UI surfaces error               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (new + confirm password)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
