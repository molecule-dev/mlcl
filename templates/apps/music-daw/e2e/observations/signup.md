# Page observations: /signup (Signup)

> Filled from a Playwright MCP walk of the live app. Public, no auth.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                                  | success signal                            | failure signal            |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| `getByRole('heading', { name: /^Fugue$/ })`        | heading | brand header                                                                                      | visible                                   | missing                   |
| `#signup-first`                                    | textbox | first name (required)                                                                             | accepts text, shape `text`                | missing or wrong type     |
| `#signup-last`                                     | textbox | last name (required)                                                                              | accepts text                              | missing                   |
| `#signup-handle`                                   | textbox | producer handle, optional, persists to `/api/preferences` after signup                            | text accepted                             | missing                   |
| `#signup-email` (`type="email" required`)          | textbox | email field                                                                                       | type=email, required attr                 | missing                   |
| `#signup-password`                                 | textbox | new password (required, min 8)                                                                    | accepts text                              | missing                   |
| `#signup-confirm`                                  | textbox | confirm password (required)                                                                       | accepts text                              | missing                   |
| `getByRole('button', { name: /show password/i })`  | button  | toggles `type="password"` ↔ `type="text"`                                                         | password input changes type               | type stays password       |
| `getByRole('button', { name: /create account/i })` | button  | submits signup form: POST `/api/users` 201 then PUT `/api/preferences` then redirect `/dashboard` | URL = `/dashboard`, JWT in localStorage   | stays on `/signup` or 4xx |
| mismatch alert                                     | text    | client-side `role="alert"` if confirm ≠ password; suppresses POST                                 | alert visible, no `/api/users` POST fired | POST fires anyway         |
| `getByRole('link', { name: /sign in/i })`          | link    | footer link to `/login`                                                                           | href = `/login`                           | missing                   |

## Hidden surfaces opened from this page

| trigger | what it opens                        | elements inside (selector / role / behavior) |
| ------- | ------------------------------------ | -------------------------------------------- |
| (none)  | signup is a single screen; no modals | n/a                                          |

## Network calls expected during normal use

| trigger              | method | path               | what request body or query is expected                                         |
| -------------------- | ------ | ------------------ | ------------------------------------------------------------------------------ |
| submit               | POST   | `/api/users`       | `{ email, password, name }`; returns `201` with `{ accessToken, user, props }` |
| submit (handle ≠ '') | PUT    | `/api/preferences` | `{ data: { handle } }`; returns 200                                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
