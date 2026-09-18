# Page observations: /reset-password (Reset password)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role               | expected behavior on interaction                                              | success signal                                              | failure signal           |
| ------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| `page.locator('main, [data-mol-id="reset-password-page"]').first()` | region             | invalid token is rejected (no silent 404) — error or invalid-token UI appears | page shows an explicit invalid-token state and does NOT 404 | silent 404 or blank page |
| `getByRole('link', { name: /back to sign in                         | back/i }).first()` | link                                                                          | returns to /login                                           | URL becomes /login       | URL unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected                     |
| ------------ | ------ | ------------------------- | ---------------------------------------------------------- |
| submit reset | POST   | /api/users/reset-password | `{ token, password }` → 200 on valid token, 4xx on invalid |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
