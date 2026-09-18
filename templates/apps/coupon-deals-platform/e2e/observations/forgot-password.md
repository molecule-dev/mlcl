# Page observations: /forgot-password (ForgotPassword)

> Captured anonymously — single-input email form.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal           | failure signal              |
| --------------------------------------------------- | ------- | -------------------------------- | ------------------------ | --------------------------- |
| `getByRole('link', { name: 'Snagr' })`              | link    | nav to /                         | URL becomes `/`          | stays on `/forgot-password` |
| `getByLabel('Email address')`                       | textbox | accepts the email                | typed value reflected    | read-only                   |
| `getByRole('button', { name: /send reset link/i })` | button  | POSTs /api/users/forgot-password | success message rendered | error message rendered      |
| `getByRole('link', { name: /back to sign in/i })`   | link    | nav to /login                    | URL becomes `/login`     | stays on `/forgot-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger     | method | path                       | expected body |
| ----------- | ------ | -------------------------- | ------------- |
| Submit form | POST   | /api/users/forgot-password | `{ email }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
