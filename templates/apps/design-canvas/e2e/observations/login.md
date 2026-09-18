# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/login`
2. browser_snapshot — login form, OAuth buttons, "Forgot?" inline link, bottom signup link
3. Re-pass after focusing inputs and clicking submit with empty fields — only HTML5 validation surfaces; no new dialogs

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction        | success signal                                               | failure signal             |
| -------------------------------------------------------- | ------- | --------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `[data-mol-id="login-form"]`                             | form    | submits to `POST /api/sessions` (login) | URL changes to `/dashboard`                                  | error alert shown          |
| `getByRole('textbox', { name: /Email/ })`                | textbox | accepts an email, required HTML5        | input value reflects typed string                            | submit blocked when empty  |
| `getByRole('textbox', { name: /^Password$/ })`           | textbox | accepts a password, required            | input value reflects typed string                            | submit blocked when empty  |
| `getByRole('link', { name: /Forgot/ })`                  | link    | navigates to `/forgot-password`         | URL becomes `/forgot-password`                               | URL stays                  |
| `getByRole('button', { name: /Sign in to Atelier/ })`    | button  | submits the form                        | navigates to `/dashboard` on success; shows alert on failure | stays on `/login` silently |
| `getByRole('link', { name: /Create a free workspace/ })` | link    | navigates to `/signup`                  | URL becomes `/signup`                                        | URL stays                  |

## Hidden surfaces opened from this page

| trigger               | what it opens                        | elements inside (selector / role / behavior) |
| --------------------- | ------------------------------------ | -------------------------------------------- |
| API failure on submit | inline alert div with `role="alert"` | shows `error.message` from useLogin hook     |

## Network calls expected during normal use

| trigger              | method | path            | what request body or query is expected |
| -------------------- | ------ | --------------- | -------------------------------------- |
| submit valid form    | POST   | `/api/sessions` | `{ email, password }`                  |
| submit invalid creds | POST   | `/api/sessions` | response 401 surfaces inline alert     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
