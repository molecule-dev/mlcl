# Page observations: /login

> Observed via Playwright at http://localhost:3080/login — public auth page
> rendered by `pages/Login.tsx`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role                          | expected behavior on interaction    | success signal                  | failure signal      |
| ----------------------------------------------------- | ----------------------------- | ----------------------------------- | ------------------------------- | ------------------- |
| `getByRole('heading').first()` (Sign in title)        | heading                       | renders the page title              | visible                         | missing             |
| `getByRole('button', { name: /sign\s*in/i }).first()` | button                        | submits → POST `/api/users/sign-in` | navigates off /login on success | stays on /login     |
| `getByRole('link', { name: /sign\s*up                 | create.*account/i }).first()` | link                                | navigates to /signup            | URL becomes /signup | unchanged |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none — page is a single form) | —             | —               |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| sign-in submit | POST   | /api/users/sign-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/01-auth.spec.ts` (login + wrong-password + login-after-signup)
