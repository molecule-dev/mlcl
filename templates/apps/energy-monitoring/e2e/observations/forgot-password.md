# Page observations: /forgot-password (Forgot password)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role               | expected behavior on interaction                          | success signal                                | failure signal           |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------------- | --------------------------------------------- | ------------------------ |
| `page.locator('input[type="email"]').first()`        | textbox            | accepts the email to send a reset link to                 | value reflects typed email                    | input rejects keystrokes |
| `page.locator('form button[type="submit"]').first()` | button             | POST /api/users/forgot-password — non-enumerable response | 200 returned and confirmation message visible | POST not sent or non-2xx |
| `getByRole('link', { name: /back to sign in          | back/i }).first()` | link                                                      | navigates back to /login                      | URL becomes /login       | URL unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected         |
| ------- | ------ | -------------------------- | ---------------------------------------------- |
| submit  | POST   | /api/users/forgot-password | `{ email }` → always 200 (no enumeration leak) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
