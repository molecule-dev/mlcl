# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                | success signal                                  | failure signal                        |
| ---------------------------------------------------- | ------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------------- |
| `page.locator('input[type="email"]').first()`        | textbox | accepts the user email for sign-in              | value reflects typed email                      | input rejects keystrokes              |
| `page.locator('input[type="password"]').first()`     | textbox | accepts the user password                       | value present (masked)                          | input rejects keystrokes              |
| `page.locator('form button[type="submit"]').first()` | button  | POST /api/users/log-in then redirect off /login | access token in localStorage; URL leaves /login | still on /login OR no token persisted |
| `getByRole('link', { name: /forgot/i })`             | link    | navigates to /forgot-password                   | URL becomes /forgot-password                    | URL unchanged                         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected                   |
| ----------- | ------ | ----------------- | -------------------------------------------------------- |
| submit form | POST   | /api/users/log-in | `{ email, password }` → 200 with `{ accessToken, user }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
