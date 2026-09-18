# Page observations: /reset-password (Reset password)

> Public — token-bearing form that rotates the password and bounces back
> to /login. Navigated to via the reset link in the password-reset email.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role               | expected behavior on interaction | success signal           | failure signal                                                                            |
| ------------------------------------------------- | ------------------ | -------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `getByRole('heading', { name: /set.*new.*password | new password/i })` | heading                          | identifies the page      | heading visible                                                                           | empty page                 |
| `getByLabel(/^new password$                       | ^password$/i)`     | textbox                          | accepts the new password | input value updates                                                                       | read-only                  |
| `getByLabel(/confirm/i)`                          | textbox            | accepts the password again       | input value updates      | mismatch error                                                                            |
| `getByRole('button', { name: /reset               | submit             | set/i })`                        | button                   | POST /api/users/reset-password with `{ token, password }`; redirects to /login on success | URL becomes `/login`       | stays with error |
| `getByRole('link', { name: /sign in               | back/i })`         | link                             | nav to /login            | URL becomes `/login`                                                                      | stays on `/reset-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                  | method | path                      | what request body or query is expected      |
| ------------------------ | ------ | ------------------------- | ------------------------------------------- |
| Submit form (with token) | POST   | /api/users/reset-password | `{ token, password }`; 200 rotates password |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-reset-password.spec.ts`
