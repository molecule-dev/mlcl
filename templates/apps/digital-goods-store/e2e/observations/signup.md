# Page observations: /signup (Signup)

> Captured from the rendered page after `browser_navigate /signup` + `browser_snapshot`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role          | expected behavior on interaction  | success signal                            | failure signal        |
| --------------------------------------------------- | ------------- | --------------------------------- | ----------------------------------------- | --------------------- |
| `#name` (Name)                                      | textbox       | accepts the seller's display name | value persists                            | inline validation     |
| `#email` (Email)                                    | textbox       | accepts a valid unique email      | value persists                            | inline validation     |
| `#password` (Password)                              | textbox       | accepts password text             | value persists                            | inline validation     |
| `getByRole('button', { name: /create account        | sign up/i })` | button                            | POST /api/users → 201, then auto-redirect | URL away from /signup | stays on /signup |
| `getByRole('link', { name: /sign in                 | log in/i })`  | link                              | nav to /login                             | URL becomes /login    | no nav           |
| `getByRole('link', { name: /github/i })` (optional) | link          | OAuth GitHub flow                 | redirect to provider                      | no nav                |

## Hidden surfaces opened from this page

| trigger              | what it opens | elements inside |
| -------------------- | ------------- | --------------- |
| (none — single form) | —             | —               |

## Network calls expected during normal use

| trigger       | method | path       | expected body             |
| ------------- | ------ | ---------- | ------------------------- |
| Submit signup | POST   | /api/users | { email, password, name } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
