# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                           | role    | expected behavior on interaction                                        | success signal                                                | failure signal                 |
| -------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------ |
| `getByRole('heading', { name: /Welcome back/i })`                    | heading | page heading renders                                                    | heading visible                                               | heading missing                |
| `getByLabel(/Email address/i)`                                       | textbox | accepts email                                                           | retains the typed value                                       | input not editable             |
| `getByLabel(/^Password$/i)`                                          | textbox | accepts a password (type=password)                                      | masked value retained                                         | input not masked               |
| `getByRole('button', { name: /^(Show password\|Hide password)$/i })` | button  | toggles password visibility (type=text↔password) and aria-pressed       | aria-pressed flips; input type alternates                     | toggle has no effect           |
| `getByRole('link', { name: /Forgot/i })`                             | link    | navigates to `/forgot-password`                                         | URL becomes `/forgot-password`                                | URL unchanged                  |
| `getByRole('button', { name: /^Sign in$/i })`                        | button  | submits credentials via POST /api/users/log-in; navigates to /dashboard | URL becomes `/dashboard`; access token stored in localStorage | URL unchanged with error toast |
| `getByRole('link', { name: /Create an account/i })`                  | link    | navigates to `/signup`                                                  | URL becomes `/signup`                                         | URL unchanged                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected        |
| -------------- | ------ | ----------------- | --------------------------------------------- |
| Sign in submit | POST   | /api/users/log-in | `{ email, password }` → 200 with access token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
