# Page observations: /signup (Signup)

> Public auth page. Display name + email + password + confirm-password
>
> - submit. Mismatched passwords surface a client-side error before
>   POST. Successful signup navigates to /c.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction | success signal                        | failure signal              |
| -------------------------------------------------- | -------------------- | -------------------------------- | ------------------------------------- | --------------------------- |
| `page.locator('#signup-name')`                     | input[type=text]     | accepts display name             | value reflects typed text             | input ignores keystrokes    |
| `page.locator('#signup-email')`                    | input[type=email]    | accepts email                    | value reflects typed text             | input ignores keystrokes    |
| `page.locator('#signup-password')`                 | input[type=password] | accepts password (min 8)         | value reflects typed text             | accepts <8 chars            |
| `page.locator('#signup-confirm')`                  | input[type=password] | accepts confirm-password         | value reflects typed text             | input ignores keystrokes    |
| `getByRole('button', { name: /Create account/i })` | button               | POST /api/users → navigate to /c | url `/c`, accessToken in localStorage | stays on /signup with error |
| `getByRole('link', { name: /Sign in/i }).first()`  | link                 | navigates to /login              | url `/login`                          | stays on /signup            |
| password mismatch then submit                      | n/a                  | shows mismatch error, no POST    | text "Passwords do not match"         | POST fires anyway           |

## Network calls expected during normal use

| trigger              | method | path         | what request body or query is expected                 |
| -------------------- | ------ | ------------ | ------------------------------------------------------ |
| Create account click | POST   | `/api/users` | `{ email, password, name? }` returns 201 + accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
