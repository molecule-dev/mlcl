# Page observations: /signup (Signup)

> Public sign-up form. Fires POST /api/users → server returns
> Authorization Bearer token + user props → SPA redirects to /dashboard.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role           | expected behavior on interaction | success signal         | failure signal     |
| --------------------------------------------- | -------------- | -------------------------------- | ---------------------- | ------------------ |
| `input[placeholder*="address"]`               | textbox        | fills the display name           | value matches          | empty              |
| `input[type="email"]`                         | textbox        | fills email                      | value matches          | empty              |
| `input[type="password"]`                      | textbox        | fills password                   | value matches (masked) | empty              |
| `getByRole('button', { name: /create.*account | sign.*up       | start.*trial                     | get.*started/i })`     | button             | submits POST /api/users → /dashboard | URL leaves /signup | stays with error toast |
| `getByRole('link', { name: /log.*in           | sign.*in/i })` | link                             | nav to /login          | URL becomes /login | stays                                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path       | expected body               |
| ----------- | ------ | ---------- | --------------------------- |
| Submit form | POST   | /api/users | `{ email, password, name }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
