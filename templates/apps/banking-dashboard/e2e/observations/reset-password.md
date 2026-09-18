# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright + e2e/reset-password.spec.ts.
The handler at `POST /api/reset_password` validates the token + age,
hashes the new password, and clears the token in one write.

## Page state assumed

- [x] Public (no auth required; reached from email link with `?token=…`)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                           | success signal               | failure signal                         |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| `input#email`                                        | textbox | accepts email (pre-filled from `?email=` query if present) | input fills                  | absent                                 |
| `input#token`                                        | textbox | accepts token (pre-filled from `?token=` query if present) | input fills                  | absent                                 |
| `input#password`                                     | textbox | accepts new password; minLength=8 + show/hide toggle       | masked by default            | absent                                 |
| Show/hide password button                            | button  | toggles password input type                                | flips type/aria-label        | inert                                  |
| `form button[type="submit"]` (Reset Password)        | button  | POST /api/reset_password; on 200 navigates to /login       | URL becomes /login           | error alert / stays on /reset-password |
| `[role="alert"][data-mol-id="reset-error"]`          | alert   | renders when API returns 4xx (e.g. invalid/expired token)  | alert visible with message   | swallowed silently                     |
| `getByRole('link', { name: /sign in/i })`            | link    | navigates to /login                                        | URL becomes /login           | URL unchanged                          |
| `getByRole('link', { name: /request a new link/i })` | link    | navigates to /forgot-password                              | URL becomes /forgot-password | URL unchanged                          |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — single-form page) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path                | what request body or query is expected                           |
| --------------------- | ------ | ------------------- | ---------------------------------------------------------------- |
| submit Reset Password | POST   | /api/reset_password | { token, password } → 200 with `{success:true}` (or 400 invalid) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
