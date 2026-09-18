# Page observations: /forgot-password & /reset-password (ForgotPassword + ResetPassword)

> Twin public flows handled by 04-forgot-reset-password.spec.ts.
> /forgot-password: POST /api/users/forgot-password regardless of
> whether the email is registered (no enumeration). /reset-password
> requires `?token=...` issued via Mailgun and submits POST
> /api/reset_password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role     | expected behavior on interaction | success signal         | failure signal |
| ----------------------------------------- | -------- | -------------------------------- | ---------------------- | -------------- |
| `input[type="email"]` (forgot-password)   | textbox  | fills email                      | value matches          | empty          |
| `getByRole('button', { name: /send        | reset    | submit                           | recover/i })` (forgot) | button         | fires POST /api/users/forgot-password | success/ack message visible          | stays with no feedback |
| `getByRole('link', { name: /back          | sign.*in | log.*in/i })` (forgot)           | link                   | nav to /login  | URL becomes /login                    | stays                                |
| `input[type="password"]` (reset-password) | textbox  | fills new password               | value masked           | empty          |
| `getByRole('button', { name: /reset       | update   | set.*password                    | submit/i })` (reset)   | button         | submits POST /api/reset_password      | navigates to /login or shows success | error inline           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger              | method | path                       | expected body         |
| -------------------- | ------ | -------------------------- | --------------------- |
| Submit form (forgot) | POST   | /api/users/forgot-password | `{ email }`           |
| Submit form (reset)  | POST   | /api/reset_password        | `{ token, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-forgot-reset-password.spec.ts`
