# Page observations: /login (Login)

> Public login form. Fires POST /api/users/log-in → returns JWT in
> Authorization header + Set-Cookie session token → SPA redirects to
> /dashboard. Wrong-password keeps the user on /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                 | role         | expected behavior on interaction | success signal                              | failure signal    |
| ------------------------------------------ | ------------ | -------------------------------- | ------------------------------------------- | ----------------- |
| `input[type="email"]`                      | textbox      | fills email                      | value matches                               | empty             |
| `input[type="password"]`                   | textbox      | fills password                   | value matches (masked)                      | empty             |
| `getByRole('button', { name: /sign in      | log in/i })` | button                           | submits POST /api/users/log-in → /dashboard | URL leaves /login | stays + error toast |
| `getByRole('link', { name: /forgot/i })`   | link         | nav to /forgot-password          | URL becomes /forgot-password                | stays             |
| `getByRole('link', { name: /sign.*up/i })` | link         | nav to /signup                   | URL becomes /signup                         | stays             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path              | expected body         |
| ----------- | ------ | ----------------- | --------------------- |
| Submit form | POST   | /api/users/log-in | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
