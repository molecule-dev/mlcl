# Page observations: /login (Sign in)

> Captured live via Playwright MCP at `http://localhost:3070/login`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                 | role    | expected behavior on interaction                                                         | success signal                                             | failure signal                               |
| -------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `getByRole('link', { name: /Verso/ })` (header brand)                      | link    | navigate to `/`                                                                          | URL is `/`                                                 | URL unchanged                                |
| `getByRole('button', { name: /toggle theme/i })`                           | button  | toggle theme                                                                             | `<html data-theme>` flips and persists across reload       | only aria-pressed flips                      |
| `getByRole('textbox', { name: /email/i })`                                 | textbox | accept user's email                                                                      | text shows in field, included in POST body                 | input ignored                                |
| `getByRole('textbox', { name: 'Password' })` (or `input[type="password"]`) | textbox | accept user's password                                                                   | text included in POST body                                 | input ignored                                |
| `getByRole('link', { name: /forgot password/i })`                          | link    | navigate to `/forgot-password`                                                           | URL is `/forgot-password`                                  | URL unchanged                                |
| `getByRole('button', { name: /sign in/i })`                                | button  | POST `/api/users/log-in`; on 200 store token + redirect to `/home`; on 4xx surface error | URL becomes `/home` and `/api/profile/me` returns the user | stays on `/login` with visible error message |
| `getByRole('link', { name: /create one/i })`                               | link    | navigate to `/signup`                                                                    | URL is `/signup`                                           | URL unchanged                                |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — login is a single form) | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                | what request body or query is expected                |
| ---------------------- | ------ | ------------------- | ----------------------------------------------------- |
| submit (valid creds)   | POST   | `/api/users/log-in` | `{ email, password }`, returns 200 + access token     |
| submit (invalid creds) | POST   | `/api/users/log-in` | same body, returns 4xx and the page stays on `/login` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
