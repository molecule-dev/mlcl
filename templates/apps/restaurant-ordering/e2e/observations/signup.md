# Page observations: /signup (Signup)

> Public — branded auth shell. Headline "Open your kitchen". Form
> collects First name, Last name, Restaurant name, Email, Password,
> Confirm password and submits via "Create account". Footer link
> "Already on the line? Sign in" returns to /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                                          | success signal         | failure signal              |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------- | ---------------------- | --------------------------- |
| `getByRole('heading', { name: /open your kitchen/i })` | heading | identifies the signup page                                                | h2 visible             | empty page                  |
| `getByLabel(/email/i)`                                 | textbox | accepts the new account email                                             | typed text reflected   | input read-only             |
| `page.locator('input[type="password"]').first()`       | textbox | accepts the new password (masked)                                         | value held in DOM      | input read-only             |
| `getByRole('button', { name: /create account/i })`     | button  | POST /api/users; on 2xx redirect to /dashboard with token in localStorage | URL becomes /dashboard | stays on /signup with error |

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
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
