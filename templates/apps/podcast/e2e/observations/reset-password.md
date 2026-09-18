# Page observations: /reset-password (ResetPassword)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /reset-password --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/reset-password.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/reset-password.spec.ts`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction       | success signal                  | failure signal           |
| ---------------------------------------------------------- | ------- | -------------------------------------- | ------------------------------- | ------------------------ |
| `getByRole('heading', { name: /choose a new password/i })` | heading | page heading                           | h2 visible                      | no heading               |
| `getByLabel(/email/i)`                                     | textbox | enters email                           | value reflects typed input      | input rejects keystrokes |
| `getByLabel(/reset token/i)`                               | textbox | enters reset token from email          | value reflects typed input      | input rejects keystrokes |
| `getByLabel(/new password/i)`                              | textbox | enters new password (masked)           | characters masked               | no masking               |
| `getByRole('button', { name: /show password/i })`          | button  | toggles password visibility            | input type flips                | no toggle                |
| `getByRole('button', { name: /reset password/i })`         | button  | submits, PATCH /api/users/:id/password | navigates to /login on success  | shows inline error       |
| `getByRole('link', { name: /back to sign in/i })`          | link    | route back to /login                   | URL changes to /login           | still here               |
| `getByRole('link', { name: /request a new link/i })`       | link    | route to /forgot-password              | URL changes to /forgot-password | still here               |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger               | method | path                    | what request body or query is expected    |
| --------------------- | ------ | ----------------------- | ----------------------------------------- |
| Reset Password submit | PATCH  | /api/users/:id/password | body { password, token } → 200 on success |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
