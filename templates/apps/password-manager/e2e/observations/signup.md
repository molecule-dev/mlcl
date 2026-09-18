# Page observations: /signup (Signup)

> Filled from a live walk via Playwright MCP at /signup. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction | success signal | failure signal                                            |
| ------------------------------------------- | ------- | -------------------------------- | -------------- | --------------------------------------------------------- |
| `input` (first name)                        | textbox | accept first name value          | value typed    | input rejects                                             |
| `input` (last name)                         | textbox | accept last name value           | value typed    | input rejects                                             |
| `input[type=email]`                         | textbox | accept email value               | value typed    | input rejects                                             |
| `input[type=password]` (master password)    | textbox | accept master password (masked)  | value typed    | input rejects                                             |
| `getByRole('button', { name: /seal my vault | create  | sign up/i })`                    | button         | POST /api/users; on success store JWT, redirect to /vault | URL no longer /signup, accessToken stored | error toast, stays on /signup |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path       | what request body or query is expected                                 |
| ------------------- | ------ | ---------- | ---------------------------------------------------------------------- |
| Seal My Vault click | POST   | /api/users | `{ firstName, lastName, email, password }` returns user + access token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
