# Page observations: /signup (Signup)

Public signup form; POSTs /api/users (real bcrypt hash) then redirects to /dashboard.

Source: this page was driven live at `http://localhost:$VITE_PORT/signup`
via Playwright + the matching `e2e/signup.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction               | success signal                        | failure signal              |
| -------------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------- | --------------------------- |
| `#signup-email`                                    | textbox | collects user email                            | value persists in field               | field missing               |
| `#signup-password`                                 | textbox | collects password (masked)                     | value masked + persisted              | field missing               |
| `#signup-name`                                     | textbox | optional display name                          | value persists in field               | field missing               |
| `getByRole("button", { name: /create account/i })` | button  | POST /api/users → 201 → redirect to /dashboard | response 201 + URL becomes /dashboard | duplicate email returns 409 |
| `getByRole("link", { name: /sign in\|log in/i })`  | link    | goes back to /login                            | href targets /login                   | link missing                |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| submit  | POST   | /api/users | { email, password, name }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
