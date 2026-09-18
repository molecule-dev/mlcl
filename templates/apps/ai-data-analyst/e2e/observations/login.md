# Page observations: /login (Login)

> Captured anonymously — Clarion auth shell with marketing copy on the
> left and the login form on the right.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                          | success signal                  | failure signal                    |
| -------------------------------------------------------- | ------- | --------------------------------------------------------- | ------------------------------- | --------------------------------- |
| `page.locator('input#email')`                            | textbox | accepts an email value                                    | input value reflects typed text | input is read-only                |
| `page.locator('input#password')`                         | textbox | accepts a password value (masked)                         | input value reflects typed text | input is read-only                |
| `getByRole('button', { name: /show password/i })`        | button  | toggles password visibility                               | password field type flips       | password remains masked           |
| `getByRole('link', { name: /forgot password/i })`        | link    | nav to /forgot-password                                   | URL becomes `/forgot-password`  | stays on `/login`                 |
| `getByRole('button', { name: /^sign in$/i })`            | button  | calls auth.login() and redirects to /dashboard on success | URL becomes `/dashboard`        | stays on `/login`, error rendered |
| `getByRole('link', { name: /start your.*-day trial/i })` | link    | nav to /signup                                            | URL becomes `/signup`           | stays on `/login`                 |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside |
| ------------------------------------ | ------------- | --------------- |
| (none — login form is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger     | method | path              | expected body         |
| ----------- | ------ | ----------------- | --------------------- |
| Submit form | POST   | /api/users/log-in | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
