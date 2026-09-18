# Page observations: /reset-password (Reset Password)

Two-input form (new password + confirm) that POSTs the reset token from
the URL search param. Routes through `usePasswordReset.confirmReset`,
which the @molecule/api-resource-user backend handles via
`POST /api/reset_password`.

## Page state assumed

- [x] Public (no auth required; token comes via ?token= URL param)

## Elements

| selector / accessible name          | role            | expected behavior on interaction | success signal     | failure signal              |
| ----------------------------------- | --------------- | -------------------------------- | ------------------ | --------------------------- |
| New password input                  | input           | type new password                | accepts text       | empty submit blocked        |
| Confirm password input              | input           | type confirm password            | accepts text       | mismatch shows inline error |
| `getByRole('button', { name: /reset | submit          | save/i })`                       | button             | submit reset                | with mismatch shown when fields differ; otherwise POST /api/reset_password and navigate to /login | error banner |
| `getByRole('link', { name: /back    | sign\s*in/i })` | link                             | navigate to /login | URL becomes /login          | no navigation                                                                                     |

## Hidden surfaces opened from this page

(none)

## Network calls expected during normal use

| trigger | method | path                | what request body or query is expected                   |
| ------- | ------ | ------------------- | -------------------------------------------------------- |
| submit  | POST   | /api/reset_password | { token, password } → 200 on valid token, 400 on invalid |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
