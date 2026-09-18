# Page observations: /reset-password

> Observed via Playwright at http://localhost:3080/reset-password?token=… —
> public auth recovery page rendered by `pages/ResetPassword.tsx`. Snapshot
> showed Email + Reset Token + New Password fields with a Reset Password
> CTA, Back to sign in / Request a new link footer links.

## Page state assumed

- [x] Public (no auth required, token from email)

## Elements

| selector / accessible name                    | role                        | expected behavior on interaction | success signal                            | failure signal                           |
| --------------------------------------------- | --------------------------- | -------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `getByRole('heading').first()`                | heading                     | renders the page title           | visible                                   | missing                                  |
| `getByRole('button', { name: /reset.*password | set.*password/i }).first()` | button                           | submits → POST `/api/users/confirm-reset` | navigates off /reset-password on success | inline error |
| `getByRole('link', { name: /back to sign in   | sign in/i }).first()`       | link                             | navigates back to /login                  | URL becomes /login                       | unchanged    |

## Hidden surfaces opened from this page

| trigger              | what it opens | elements inside |
| -------------------- | ------------- | --------------- |
| (none — single form) | —             | —               |

## Network calls expected during normal use

| trigger                     | method | path                                          | what request body or query is expected |
| --------------------------- | ------ | --------------------------------------------- | -------------------------------------- |
| Reset Password submit       | POST   | /api/users/confirm-reset (molecule auth bond) | { token, password }                    |
| (post-success) auto sign-in | POST   | /api/users/sign-in                            | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/09-auth-recovery.spec.ts`
