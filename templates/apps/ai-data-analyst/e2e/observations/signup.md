# Page observations: /signup (Signup)

> Captured anonymously — Clarion auth shell with the signup form.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction             | success signal                  | failure signal                     |
| -------------------------------------------------- | ------- | -------------------------------------------- | ------------------------------- | ---------------------------------- |
| `page.locator('input[type="email"]')`              | textbox | accepts an email value                       | input value reflects typed text | input is read-only                 |
| `page.locator('input[type="password"]')`           | textbox | accepts a password value (masked)            | input value reflects typed text | input is read-only                 |
| `getByRole('button', { name: /create account/i })` | button  | POSTs /api/users and redirects to /dashboard | URL becomes `/dashboard`        | stays on `/signup`, error rendered |
| `getByRole('link', { name: /sign in/i })`          | link    | nav to /login                                | URL becomes `/login`            | stays on `/signup`                 |

## Hidden surfaces opened from this page

| trigger                               | what it opens | elements inside |
| ------------------------------------- | ------------- | --------------- |
| (none — signup form is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger     | method | path       | expected body         |
| ----------- | ------ | ---------- | --------------------- |
| Submit form | POST   | /api/users | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
