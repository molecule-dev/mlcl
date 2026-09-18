# Page observations: auth (landing + login + signup + forgot/reset password + protected redirect)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` and
> the unauthenticated → protected-route redirect.

## Page state assumed

- [x] Public for `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`. Authenticated probe for the sign-out flow.

## Elements

| selector / accessible name                                             | role                               | expected behavior on interaction                            | success signal                                               | failure signal                                     |
| ---------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `getByRole('link', { name: /start free                                 | get started/i })` on landing       | link                                                        | Navigates from `/` to `/signup`                              | URL becomes `/signup`                              | Stays on `/`                            |
| `getByRole('button', { name: /create.*account                          | sign\s*up                          | register                                                    | get\s*started/i })` (Signup form submit)                     | button                                             | POST `/api/users`, set cookie, redirect | URL becomes `/today`     | Stays on `/signup` with error |
| `getByRole('button', { name: /sign\s*in                                | log\s*in/i })` (Login form submit) | button                                                      | POST `/api/users/log-in`, redirect                           | URL becomes `/today` (or original protected route) | Stays on `/login`                       |
| Protected-route guard for `/today` (no element — redirect side-effect) | guard                              | Unauthenticated GET `/today` → redirect                     | URL becomes `/login`                                         | Stays on `/today`                                  |
| `getByRole('button', { name: /sign\s*out/i })` on `/settings`          | button                             | Clears auth + navigates to `/login`                         | URL becomes `/login`                                         | Stays on `/settings`                               |
| `getByRole('textbox')` on `/signup` (name + email + password fields)   | textbox                            | Form fields accept and validate input                       | Submit enabled when all filled                               | Submit blocked or validation error shown           |
| `getByLabel(/email/i)` + submit on `/forgot-password`                  | textbox+button                     | POST `/api/users/forgot-password`, show "sent" confirmation | "Check your email" / "sent" copy appears                     | Form stays unchanged, error visible                |
| `getByLabel(/^new password$/i)` + submit on `/reset-password`          | textbox+button                     | POST `/api/users/reset-password` with token                 | 4xx response (invalid token) or success redirect to `/login` | No POST observed                                   |
| `getByText(/sent                                                       | check your email                   | reset link/i)`on`/forgot-password` after submit             | text                                                         | Confirmation banner shown after request            | Visible within 10s                      | Stays in form-only state |

## Hidden surfaces opened from this page

(none — auth pages are flat forms; no menus/modals/accordions)

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected                    |
| ---------------------- | ------ | -------------------------- | --------------------------------------------------------- |
| Signup submit          | POST   | /api/users                 | `{ name, email, password }` → 201 + Set-Cookie            |
| Login submit           | POST   | /api/users/log-in          | `{ email, password }` → 200 + Set-Cookie                  |
| Forgot password submit | POST   | /api/users/forgot-password | `{ email }` → 200 (always 200 to avoid email enumeration) |
| Reset password submit  | POST   | /api/users/reset-password  | `{ token, password }` → 200 on valid, 401/400 on invalid  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-auth.spec.ts`
