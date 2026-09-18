# Page observations: /forgot-password

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public

## Elements

| selector / accessible name                          | role        | expected behavior on interaction                                           | success signal                                                                  | failure signal     |
| --------------------------------------------------- | ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| `getByRole('link', { name: /sparq home/i })`        | link        | navigate to /                                                              | URL = /                                                                         | otherwise          |
| `getByRole('button', { name: /toggle theme/i })`    | button      | flips data-theme                                                           | data-theme attr changes                                                         | unchanged          |
| `getByRole('textbox', { name: /email/i })`          | input email | accept text                                                                | value reflects typed                                                            | missing            |
| `getByRole('button', { name: /send reset link/i })` | submit      | POST /api/users/password-reset/request — always 202 (no email enumeration) | success card "Check your inbox" with `{{email}}` interpolated, form swapped out | error text visible |
| `getByRole('link', { name: /back to sign in/i })`   | link        | navigates to /login                                                        | URL = /login                                                                    | otherwise          |
| `getByRole('link', { name: /privacy/i })`           | link        | navigates to /privacy                                                      | URL = /privacy                                                                  | otherwise          |
| `getByRole('link', { name: /terms/i })`             | link        | navigates to /terms                                                        | URL = /terms                                                                    | otherwise          |
| `getByRole('button', { name: /language/i })`        | button      | opens language switcher                                                    | popover visible                                                                 | no popover         |

## Hidden surfaces opened from this page

(none beyond language popover)

## Network calls expected during normal use

| trigger | method | path                              | body                                         |
| ------- | ------ | --------------------------------- | -------------------------------------------- |
| submit  | POST   | /api/users/password-reset/request | `{ email }`; 202 (idempotent / privacy-safe) |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] form has email + submit + success-state documented
- [x] every link href documented
- [x] success card with `{{email}}` interpolation covered
- [x] all rows have a corresponding test in `e2e/forgot-password.spec.ts`
