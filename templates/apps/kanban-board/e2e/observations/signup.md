# Page observations: /signup (Signup)

> Filled by AI agent driving the running app on http://localhost:3020.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                    | success signal            | failure signal                     |
| ------------------------------------------------------- | ------- | --------------------------------------------------- | ------------------------- | ---------------------------------- |
| `getByLabel(/Full name/i)` (autoComplete=name)          | textbox | accepts a name string                               | input has the typed value | empty / reset                      |
| `getByLabel(/Work email/i)` (autoComplete=email)        | textbox | accepts an email value                              | input has the typed value | empty / reset                      |
| `getByLabel(/Password/i)` (autoComplete=new-password)   | textbox | accepts a masked password (≥8 chars)                | input has the typed value | plain text / empty                 |
| `getByRole("button", { name: /Create my workspace/i })` | button  | POSTs to /api/users; navigates to /dashboard on 201 | URL becomes /dashboard    | stays on /signup with inline error |
| `getByRole("link", { name: /^Sign in$/i })` (footer)    | link    | navigates to /login                                 | URL becomes /login        | stays on /signup                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path       | what request body or query is expected                          |
| ----------------- | ------ | ---------- | --------------------------------------------------------------- |
| submit valid form | POST   | /api/users | { email, password, name }; response 201 with accessToken + user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
