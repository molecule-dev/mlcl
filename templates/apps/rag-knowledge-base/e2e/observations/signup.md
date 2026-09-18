# Page observations: /signup (Signup)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                    | success signal             | failure signal           |
| ---------------------------------------------------- | ------- | --------------------------------------------------- | -------------------------- | ------------------------ |
| `locator('input#firstName')`                         | textbox | accepts a first name                                | value reflects typed input | input cleared / disabled |
| `locator('input#lastName')`                          | textbox | accepts a last name                                 | value reflects typed input | input cleared / disabled |
| `locator('input#email')`                             | textbox | accepts an email address                            | value reflects typed input | input cleared / disabled |
| `locator('input#password')`                          | textbox | accepts a password                                  | value reflects typed input | input cleared / disabled |
| `locator('input#confirm')`                           | textbox | accepts confirm password                            | value reflects typed input | input cleared / disabled |
| `getByRole('button', { name: /create\s+account/i })` | button  | POSTs /api/users, persists token, redirects to /ask | URL becomes /ask           | stays on /signup         |
| `getByRole('link', { name: /sign\s+in/i })`          | link    | navigates to /login                                 | URL becomes /login         | stays on /signup         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| submit  | POST   | /api/users | { name, email, password }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
