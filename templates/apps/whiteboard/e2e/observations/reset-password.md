# Page observations: /reset-password (Reset password)

> Public — confirms a new password from a reset token. The form has
> four fields: email, token, password, confirm. Email + token may be
> pre-filled from the `?email=&token=` query string. Submit is disabled
> while the two password fields disagree.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                            | role      | expected behavior on interaction                                                                                                                  | success signal                                                                                      | failure signal                             |
| ------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| four-field form (`email`, `text`-token, `password` ×2) + submit + mismatch validation | form      | renders email + token + 2 password fields + a submit button; submit disables and "passwords do not match" appears when the two passwords disagree | inputs visible, count of `password` inputs is 2, submit disabled on mismatch, mismatch text visible | any field missing or submit always enabled |
| bogus-token rejection (`POST /api/users/reset-password`)                              | network   | API rejects unknown reset tokens with status ≥400 (never silently 200)                                                                            | response status >= 400                                                                              | 2xx (silent acceptance)                    |
| email + token query-param pre-fill                                                    | composite | `/reset-password?email=&token=` pre-fills the email and token inputs on first paint                                                               | inputs values match query string                                                                    | empty inputs when query present            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected           |
| ------- | ------ | ------------------------- | ------------------------------------------------ |
| submit  | POST   | /api/users/reset-password | `{ email, token, password }`; bogus token → ≥400 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
