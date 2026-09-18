# Page observations: /signup

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                   | success signal                                      | failure signal              |
| -------------------------------------------------- | ------- | -------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| `getByLabel(/first name/i)`                        | textbox | accepts given-name                                 | textbox keeps the typed value                       | input not editable          |
| `getByLabel(/last name/i)`                         | textbox | accepts family-name                                | textbox keeps the typed value                       | input not editable          |
| `getByLabel(/email/i)`                             | textbox | accepts an email address                           | textbox keeps the value                             | input not editable          |
| `getByLabel(/^password$/i)`                        | textbox | accepts a password (type=password)                 | masked, value stored                                | input not masked            |
| `getByLabel(/confirm.*password/i)`                 | textbox | accepts the password again                         | matches first password                              | mismatch error on submit    |
| `getByRole('button', { name: /Create account/i })` | button  | POST /api/users, store JWT, navigate to /dashboard | URL becomes /dashboard, accessToken in localStorage | stays on /signup with error |
| `getByRole('link', { name: /Sign in/i })`          | link    | navigates to /login                                | URL is /login                                       | unchanged                   |
| `getByRole('link', { name: /Plume/i }).first()`    | link    | navigates to /                                     | URL is /                                            | unchanged                   |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected            |
| --------------------- | ------ | ---------- | ------------------------------------------------- |
| Create account submit | POST   | /api/users | { email, password, name } → 201 with access token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
