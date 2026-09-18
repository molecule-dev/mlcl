# Page observations: /signup (Signup)

> Public sign-up funnel. Creates a brand-new account, persists the JWT
>
> - user into `localStorage` (`molecule:auth:accessToken`,
>   `molecule:auth:user`), and redirects into the authed app. The first
>   read after signup also triggers the `_seed.ts` demo populate — the
>   new user lands with 4 demo clients + 5 demo invoices already visible.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role               | expected behavior on interaction                             | success signal                                          | failure signal                             |
| ---------------------------------------------------------- | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| `getByLabel(/first name/i)`                                | textbox            | accepts name; required                                       | value retained                                          | required-field flash                       |
| `getByLabel(/last name/i)`                                 | textbox            | accepts name; required                                       | value retained                                          | required-field flash                       |
| `getByLabel(/work email/i)`                                | textbox            | accepts email; required + unique                             | value retained; submit succeeds with new email          | submit fails with "user exists" or similar |
| `getByLabel(/^password$/i)`                                | textbox (password) | accepts password; meets min length                           | value retained, masked                                  | required-field flash                       |
| `getByRole('button', { name: /^Create account$/ })` (form) | button             | POSTs new user; redirects authenticated user to `/dashboard` | URL changes off `/signup`, localStorage has accessToken | stays on `/signup`, error visible          |
| `getByRole('link', { name: /^Sign in$/ })`                 | link               | navigates to `/login`                                        | URL ends `/login`                                       | stays on `/signup`                         |

## Hidden surfaces opened from this page

| trigger                                       | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------- | ------------- | -------------------------------------------- |
| Footer Privacy/Terms/Language modals (shared) | —             | covered in /root spec                        |

## Network calls expected during normal use

| trigger                | method | path       | what request body or query is expected                                          |
| ---------------------- | ------ | ---------- | ------------------------------------------------------------------------------- |
| Create account submit  | POST   | /api/users | `{ email, password, name? / firstName / lastName }`; 200/201 with `accessToken` |
| Duplicate email submit | POST   | /api/users | 4xx; UI shows error                                                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
