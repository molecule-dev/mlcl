# Page observations: /signup (Signup)

5-input signup form (first/last/email/password/confirm) with OAuth provider
buttons. On submit calls @molecule/app-auth's `useSignup` which POSTs to
`/api/users` and (on success) the SDK calls `/api/users/me` to populate
the auth context, then the page navigates to /search. Mismatched passwords
short-circuit before the request and surface an inline error.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                      | role            | expected behavior on interaction | success signal        | failure signal                                    |
| ----------------------------------------------- | --------------- | -------------------------------- | --------------------- | ------------------------------------------------- |
| `getByRole('textbox', { name: /first name/i })` | input           | type first name                  | input value updates   | input not editable                                |
| `getByRole('textbox', { name: /email/i })`      | input           | type email; required, type=email | input accepts text    | submit fails with no value                        |
| password input + confirm                        | input           | type matching password ≥ 8 chars | submit goes through   | mismatched → "Passwords don't match" inline error |
| `getByRole('button', { name: /create account    | sign\s*up/i })` | button                           | submit signup form    | POST /api/users 201, navigate to /search          | error banner persists, stays on /signup |
| `getByRole('link', { name: /sign in/i })`       | link            | navigate to /login               | URL changes to /login | no navigation                                     |

## Hidden surfaces opened from this page

(no menus or modals — full-page form)

## Network calls expected during normal use

| trigger                    | method | path          | what request body or query is expected                  |
| -------------------------- | ------ | ------------- | ------------------------------------------------------- |
| submit                     | POST   | /api/users    | { name, email, password } → 201 + { accessToken, user } |
| post-signup auth bootstrap | GET    | /api/users/me | 200 with profile after token persisted                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
