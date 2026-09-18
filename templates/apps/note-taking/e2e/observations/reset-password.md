# Page observations: /reset-password

> Captured live via Playwright MCP at
> `http://localhost:3070/reset-password?token=test123`.

## Page state assumed

- [x] Public (token-bearing URL, anonymous user)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                                                                         | success signal                                    | failure signal                              |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------- |
| `getByRole('link', { name: /Verso/ })` (header brand) | link    | navigate to `/`                                                                                                          | URL is `/`                                        | URL unchanged                               |
| `getByRole('button', { name: /toggle theme/i })`      | button  | toggle theme                                                                                                             | `<html data-theme>` flips, persists across reload | aria-pressed only                           |
| `getByRole('textbox', { name: /email/i })`            | textbox | accept the user's email                                                                                                  | text included in POST body                        | input ignored                               |
| `getByRole('textbox', { name: /reset code/i })`       | textbox | accept the reset token; URL `?token=` query value pre-fills it                                                           | initial value matches `?token` query param        | empty when query token is present           |
| `input[type="password"]`                              | textbox | accept new password (min 8 chars hint)                                                                                   | text included in POST body                        | submit accepts <8 chars                     |
| `getByRole('button', { name: /save and sign in/i })`  | button  | POST `/api/reset_password` `{ email, token, password }`; on 200 redirect to `/home` (auto sign-in); on 4xx surface error | `/home` after success; user is logged in          | invalid token returns 4xx and stays on page |
| `getByRole('link', { name: /back to sign in/i })`     | link    | navigate to `/login`                                                                                                     | URL is `/login`                                   | URL unchanged                               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                  | what request body or query is expected                                                         |
| ------- | ------ | --------------------- | ---------------------------------------------------------------------------------------------- |
| submit  | POST   | `/api/reset_password` | `{ email, token, password }`; returns 200 + auto-login token, or 4xx for invalid/expired token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
