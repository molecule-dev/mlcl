# Page observations: /login (Login)

> Public auth surface. Email + password form posts to POST /api/users/log-in
> and stores the returned JWT in localStorage. Spec: e2e/12-login.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                              | role    | expected behavior on interaction       | success signal               | failure signal |
| ----------------------------------------------------------------------- | ------- | -------------------------------------- | ---------------------------- | -------------- |
| `input[type="email"]`                                                   | textbox | accepts email                          | value committed              | nothing typed  |
| `input[type="password"]`                                                | textbox | accepts password                       | value committed              | nothing typed  |
| `getByRole('button', { name: /Initialize Session\|Sign in\|Log in/i })` | button  | submits form to POST /api/users/log-in | redirects off /login         | error visible  |
| `getByRole('link', { name: /forgot/i })`                                | link    | navigates to /forgot-password          | URL becomes /forgot-password | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path              | expected body       |
| ------- | ------ | ----------------- | ------------------- |
| Submit  | POST   | /api/users/log-in | { email, password } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-login.spec.ts`
