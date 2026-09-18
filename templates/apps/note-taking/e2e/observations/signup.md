# Page observations: /signup (Sign up)

> Captured live via Playwright MCP at `http://localhost:3070/signup`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                                                         | success signal                                                                               | failure signal                          |
| ---------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| `getByRole('link', { name: /Verso/ })` (header brand)      | link    | navigate to `/`                                                                          | URL is `/`                                                                                   | URL unchanged                           |
| `getByRole('button', { name: /toggle theme/i })`           | button  | toggle dark/light theme, persist                                                         | `<html data-theme>` flips and persists across reload                                         | aria-pressed only                       |
| `getByRole('textbox', { name: /display name/i })`          | textbox | accept user's display name; first form field                                             | text appears and is included in POST body as `name`                                          | input ignored                           |
| `getByRole('textbox', { name: /email/i })`                 | textbox | accept user's email; required, unique                                                    | submitted in POST body as `email`; unique-violations show error UI                           | accepts duplicates with no error        |
| `input[type="password"]`                                   | textbox | accept password; ≥8 chars (hint text)                                                    | submitted in POST body as `password`                                                         | submit succeeds with <8 chars           |
| `getByRole('button', { name: /create my notebook/i })`     | button  | POST `/api/users` with name/email/password; on success store JWT and redirect to `/home` | URL becomes `/home`, `localStorage` has access token, `/api/profile/me` returns the new user | stays on `/signup` with no error or 5xx |
| `getByRole('link', { name: /sign in/i })` (footer of card) | link    | navigate to `/login`                                                                     | URL is `/login`                                                                              | URL unchanged                           |

## Hidden surfaces opened from this page

| trigger                                  | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------- | ------------- | -------------------------------------------- |
| (none — single form, no menus or modals) | —             | —                                            |

## Network calls expected during normal use

| trigger                       | method | path         | what request body or query is expected           |
| ----------------------------- | ------ | ------------ | ------------------------------------------------ |
| submit form (success)         | POST   | `/api/users` | `{ name, email, password }`, returns 201 + token |
| submit form (duplicate email) | POST   | `/api/users` | same body, returns 4xx with error message        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
