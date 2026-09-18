# Page observations: /forgot-password (ForgotPassword)

Source: live walk via Playwright + e2e/forgot-password.spec.ts.
Single-field email form that POSTs `/api/users/forgot-password`. On
success the page swaps to a "we sent a reset link" confirmation. The
backend never enumerates valid vs invalid emails — both produce the
same UI state.

## Page state assumed

- [x] Public (unauthenticated)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                  | success signal                | failure signal      |
| ----------------------------------------------------------- | ------- | ------------------------------------------------- | ----------------------------- | ------------------- |
| `input#email` + `form button[type="submit"]`                | form    | renders email field + submit                      | both visible                  | missing             |
| Submit fires POST /api/users/forgot-password                | network | `{email}` body, 200 reply                         | network capture sees POST 200 | request never fires |
| Success state shows the confirmed email                     | section | "we sent a link to {email}" + back-to-sign-in CTA | email text + button visible   | success view absent |
| `getByRole('link', { name: /back to sign in/i })`           | link    | navigates to /login                               | URL becomes /login            | URL unchanged       |
| Non-enumeration property — unknown email also shows success | form    | API returns 200 even for a non-existent email     | success copy still visible    | leaks "not found"   |

## Network calls expected during normal use

| trigger       | method | path                       | what request body or query is expected              |
| ------------- | ------ | -------------------------- | --------------------------------------------------- |
| submit form   | POST   | /api/users/forgot-password | `{email}` → 200 (always)                            |
| (side-effect) | —      | mailgun                    | sandbox/staging — token written to usersSecrets row |

## Coverage check (final pass)

- [x] Navigated and re-navigated, no new elements found
- [x] Form field + submit covered
- [x] Both pre-/post-submit UI states observed
- [x] Both back-links covered
- [x] No-enumeration property tested
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
