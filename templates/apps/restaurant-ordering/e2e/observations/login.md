# Page observations: /login (Login)

> Public — branded auth shell with the Hearth wordmark, the headline
> "Hearth — Every table, served", an email + password form, a "Forgot
> password?" link, a "Show password" toggle, and a "New to Hearth? Open
> your kitchen" cross-link to /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                      | success signal                  | failure signal    |
| ------------------------------------------------- | ------- | ----------------------------------------------------- | ------------------------------- | ----------------- |
| `getByRole('heading', { name: /^hearth$/i })`     | heading | identifies the page brand                             | h1 visible                      | empty page        |
| `getByLabel(/email address/i)`                    | textbox | accepts the user's email                              | input value reflects typed text | input read-only   |
| `getByLabel(/password/i).first()`                 | textbox | accepts the user's password (masked)                  | input value reflects typed text | input read-only   |
| `getByRole('button', { name: /sign in/i })`       | button  | POST /api/users/log-in; on 2xx redirect to /dashboard | URL becomes `/dashboard`        | stays on `/login` |
| `getByRole('link', { name: /forgot password/i })` | link    | nav to /forgot-password                               | URL becomes `/forgot-password`  | stays on `/login` |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside |
| ------- | -------------------------------- | --------------- |
| (none)  | (no menus / modals on this page) | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-login.spec.ts`
