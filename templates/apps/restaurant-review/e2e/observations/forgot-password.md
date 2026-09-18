# Page observations: /forgot-password (ForgotPassword)

> Public auth-recovery surface. Single email input posts to
> POST /api/users/forgot-password which always 2xxs (so account
> existence isn't leaked) and triggers Mailgun delivery server-side.
> Spec: e2e/13-forgot-password.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction           | success signal                             | failure signal |
| ------------------------------------------------------- | ------- | ------------------------------------------ | ------------------------------------------ | -------------- |
| `input[type="email"]`                                   | textbox | accepts email                              | value committed                            | nothing typed  |
| `getByRole('button').first()`                           | button  | submits to POST /api/users/forgot-password | confirmation surface or redirect to /login | error visible  |
| `getByRole('link', { name: /sign in\|log in\|back/i })` | link    | back to /login                             | URL becomes /login                         | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                       | expected body |
| ------- | ------ | -------------------------- | ------------- |
| Submit  | POST   | /api/users/forgot-password | { email }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-forgot-password.spec.ts`
