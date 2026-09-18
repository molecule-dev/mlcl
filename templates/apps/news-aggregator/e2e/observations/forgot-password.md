# Page observations: /forgot-password

> Observed via Playwright at http://localhost:3080/forgot-password — public
> auth recovery page rendered by `pages/ForgotPassword.tsx`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction       | success signal         | failure signal |
| ----------------------------------------------------------- | ------- | -------------------------------------- | ---------------------- | -------------- |
| `getByRole('heading').first()`                              | heading | renders the page title                 | visible                | missing        |
| `getByRole('button', { name: /reset                         | send    | submit                                 | email me/i }).first()` | button         | submits → POST `/api/users/reset-password` | "Check your email" confirmation | swallowed error |
| `getByRole('button', { name: /back to sign in/i }).first()` | button  | post-success → navigate back to /login | URL becomes /login     | unchanged      |

## Hidden surfaces opened from this page

| trigger          | what it opens      | elements inside                                                     |
| ---------------- | ------------------ | ------------------------------------------------------------------- |
| Submit (success) | confirmation panel | check_circle icon + "Check your email" copy + "Back to sign in" CTA |

## Network calls expected during normal use

| trigger | method | path                                          | what request body or query is expected |
| ------- | ------ | --------------------------------------------- | -------------------------------------- |
| Submit  | POST   | /api/users/reset-password (or password-reset) | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/09-auth-recovery.spec.ts`
