# Page observations: /forgot-password (ForgotPassword)

> Single-input page that posts to the auth-bond's password-reset entry
> point. Returns 2xx whether or not the email matches an account (to
> avoid account-enumeration). The companion `/reset-password` page
> consumes the token issued by this flow.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role            | expected behavior on interaction                                                  | success signal          | failure signal       |
| -------------------------------------------------- | --------------- | --------------------------------------------------------------------------------- | ----------------------- | -------------------- |
| `getByLabel(/work email/i)`                        | textbox (email) | accepts email; required                                                           | value retained          | required-field flash |
| `getByRole('button', { name: /Send reset link/ })` | button          | POSTs to forgot-password endpoint; UI flips into "check your email" success state | success message visible | error banner         |
| `getByRole('link', { name: /Back to sign in/ })`   | link            | navigates to `/login`                                                             | URL ends `/login`       | stays                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected  |
| ---------------------- | ------ | -------------------------- | --------------------------------------- |
| Send reset link submit | POST   | /api/users/forgot-password | `{ email }`; 200 even for unknown email |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
