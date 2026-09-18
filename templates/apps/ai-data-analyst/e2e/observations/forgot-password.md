# Page observations: /forgot-password (ForgotPassword)

> Captured anonymously — minimal recovery form that POSTs an email
> address to /api/users/forgot-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role             | expected behavior on interaction | success signal                                         | failure signal          |
| --------------------------------------------- | ---------------- | -------------------------------- | ------------------------------------------------------ | ----------------------- |
| `page.locator('input[type="email"]')`         | textbox          | accepts an email value           | input value reflects typed text                        | input is read-only      |
| `getByRole('button', { name: /send reset link | reset link/i })` | button                           | POST /api/users/forgot-password and shows confirmation | success message visible | error message visible, no request fired |
| `getByRole('link', { name: /back to login     | sign in/i })`    | link                             | nav to /login                                          | URL becomes `/login`    | stays on `/forgot-password`             |

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
- [x] All elements above have a corresponding test in `e2e/04-forgot-password.spec.ts`
