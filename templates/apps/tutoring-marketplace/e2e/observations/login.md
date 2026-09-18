# Page observations: /login (Login)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role          | expected behavior on interaction | success signal                               | failure signal         |
| ------------------------------------------------- | ------------- | -------------------------------- | -------------------------------------------- | ---------------------- |
| `getByRole('link', { name: /^chalk$/i })`         | link          | back to /                        | URL is /                                     | nav fails              |
| `getByRole('button', { name: /toggle theme/i })`  | button        | flips html theme attr            | data-mol-mode differs                        | attribute unchanged    |
| `page.locator('input[type="email"]')`             | textbox       | accepts email                    | value typed                                  | invalid email rejected |
| `page.locator('input[type="password"]')`          | textbox       | accepts password (masked)        | value typed                                  | rejected               |
| `getByRole('button', { name: /show password/i })` | button        | toggles password visibility      | type flips text↔password                     | unchanged              |
| `getByRole('link', { name: /forgot/i })`          | link          | go to /forgot-password           | URL is /forgot-password                      | nav fails              |
| `page.locator('form button[type="submit"]')`      | button        | POST /api/users/log-in           | redirect off /login + bearer in localStorage | 4xx + still on /login  |
| `getByRole('link', { name: /create an account     | sign up/i })` | link                             | go to /signup                                | URL is /signup         | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected |
| ----------- | ------ | ----------------- | -------------------------------------- |
| submit form | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
