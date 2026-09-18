# Page observations: /forgot-password

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/forgot-password`.
> Public reset-request form provided by `@molecule/app-auth-default`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                  | success signal                 | failure signal                |
| ------------------------------------------------------- | ------- | ----------------------------------------------------------------- | ------------------------------ | ----------------------------- |
| `getByRole('heading', { name: /^Refract$/ })`           | heading | brand heading                                                     | visible                        | missing                       |
| `getByText(/Reset your password/)`                      | text    | screen subheader                                                  | visible                        | missing                       |
| `getByText(/Enter your email to receive a reset link/)` | text    | helper copy                                                       | visible                        | "Coming soon" / placeholder   |
| `getByLabel(/EMAIL/i)`                                  | textbox | email input                                                       | enterable, type=email          | not focusable                 |
| `getByRole('button', { name: /Send Reset Link/ })`      | button  | POSTs `/api/users/sendPasswordReset` and shows confirmation toast | spinner → confirmation message | error toast / no network call |
| `getByRole('link', { name: /Back to Sign In/ })`        | link    | navigates to `/login`                                             | URL becomes `/login`           | stays on `/forgot-password`   |

## Hidden surfaces opened from this page

| trigger | what it opens                | elements inside (selector / role / behavior) |
| ------- | ---------------------------- | -------------------------------------------- |
| (none)  | no menus/modals on this page | n/a                                          |

## Network calls expected during normal use

| trigger               | method | path                           | what request body or query is expected                                           |
| --------------------- | ------ | ------------------------------ | -------------------------------------------------------------------------------- |
| Send Reset Link click | POST   | `/api/users/sendPasswordReset` | `{ email: <typed email> }`; backend always 200 (does not leak account existence) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (single email field)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
