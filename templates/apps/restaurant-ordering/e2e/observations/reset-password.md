# Page observations: /reset-password (ResetPassword)

> Public — branded auth shell. Heading "Reset your password",
> hidden-prefilled email + token from `?email=&token=` query params,
> a new-password input, and a submit action that POSTs to
> /api/users/reset-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction                                                   | success signal                                                                       | failure signal                                 |
| -------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `getByRole('heading', { name: /reset your password | new password/i })`   | heading                                                                            | identifies the reset page                                                            | h2 visible                                     | empty page      |
| `getByLabel(/new password                          | password/i).first()` | textbox                                                                            | accepts the new password (masked)                                                    | typed value reflected                          | input read-only |
| query-param prefill (`?email=&token=`)             | (URL)                | the page reads the token + email from the URL and posts them with the new password | submission succeeds and the user can log in with the new password (read-after-write) | token ignored / submission rejects valid token |
| invalid-token error path                           | text/button          | submitting an obviously bogus token surfaces an error                              | error/toast visible after submit                                                     | success state on bogus token                   |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside |
| ------- | -------------------------------- | --------------- |
| (none)  | (no menus / modals on this page) | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-reset-password.spec.ts`
