# Page observations: /login (Public sign-in form)

Captured via `node scripts/observe-page.mjs ai-study-buddy /login`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role    | expected behavior on interaction                     | success signal                              | failure signal      |
| --------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------- | ------------------- |
| `[data-mol-id="login-email"]`           | textbox | email input, autofocused                             | accepts typed email                         | missing             |
| `[data-mol-id="login-password"]`        | textbox | password input (masked)                              | accepts typed password                      | missing             |
| `[data-mol-id="login-toggle-password"]` | button  | toggles password visibility (eye icon)               | input switches `type="text"` ↔ `"password"` | toggle does nothing |
| `[data-mol-id="login-submit"]`          | button  | POSTs `/api/users/log-in`, navigates to `/dashboard` | URL becomes `/dashboard`                    | `login-error` shows |
| `[data-mol-id="login-error"]`           | alert   | inline error for invalid credentials                 | text e.g. "Invalid credentials"             | hidden until 4xx    |
| `[data-mol-id="login-forgot-link"]`     | link    | nav to `/forgot-password`                            | URL becomes `/forgot-password`              | stays               |
| `[data-mol-id="login-signup-link"]`     | link    | nav to `/signup`                                     | URL becomes `/signup`                       | stays               |

## Hidden surfaces opened from this page

| trigger                    | what it opens       | elements inside (selector / role / behavior) |
| -------------------------- | ------------------- | -------------------------------------------- |
| Toggle password visibility | inline state change | input type="text" reveals plaintext          |

## Network calls expected during normal use

| trigger     | method | path                | what request body or query is expected |
| ----------- | ------ | ------------------- | -------------------------------------- |
| Submit form | POST   | `/api/users/log-in` | `{ email, password, deviceName? }`     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-login.spec.ts`
