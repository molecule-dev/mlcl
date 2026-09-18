# Page observations: /forgot-password

> Captured live via Playwright MCP at `http://localhost:3070/forgot-password`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                                                                            | success signal                                                                                    | failure signal                        |
| ----------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `getByRole('link', { name: /Verso/ })` (header brand) | link    | navigate to `/`                                                                                                             | URL is `/`                                                                                        | URL unchanged                         |
| `getByRole('button', { name: /toggle theme/i })`      | button  | toggle theme; persists                                                                                                      | `<html data-theme>` flips and persists across reload                                              | aria-pressed only                     |
| `getByRole('textbox', { name: /email/i })`            | textbox | accept email; required                                                                                                      | text included in POST body                                                                        | input ignored                         |
| `getByRole('button', { name: /send reset link/i })`   | button  | POST `/api/users/forgot-password` regardless of whether email exists; never leaks user existence; success UI stays the same | request returns 200/204 with same shape for known/unknown emails; user sees confirmation/no error | response leaks "user not found" / 4xx |
| `getByRole('link', { name: /sign in/i })`             | link    | navigate to `/login`                                                                                                        | URL is `/login`                                                                                   | URL unchanged                         |

## Hidden surfaces opened from this page

| trigger                                  | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------- | ------------- | -------------------------------------------- |
| (none — single form, no menus or modals) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                         | what request body or query is expected                                    |
| ----------- | ------ | ---------------------------- | ------------------------------------------------------------------------- |
| submit form | POST   | `/api/users/forgot-password` | `{ email }`, returns 200 even for unknown emails (no user-existence leak) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
