# Page observations: /login

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                      | role           | expected behavior on interaction                          | success signal                                                             | failure signal               |
| ------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `getByRole('link', { name: /sparq home/i })`                                    | link           | navigate to /                                             | URL = /                                                                    | otherwise                    |
| `getByRole('button', { name: /toggle theme/i })`                                | button         | flips data-theme on `<html>`                              | data-theme attr changes                                                    | unchanged                    |
| `getByRole('textbox', { name: /email/i })`                                      | input email    | accept text                                               | value reflects typed                                                       | typed value missing          |
| `getByRole('textbox', { name: /password/i })` (typed as `input[type=password]`) | input password | accept text                                               | value reflects typed (DOM)                                                 | typed value missing          |
| `getByRole('link', { name: /forgot password/i })`                               | link           | navigates to /forgot-password                             | URL = /forgot-password                                                     | otherwise                    |
| `getByRole('button', { name: /^log in$/i })`                                    | submit         | POST /api/sessions, set bearer, navigate away from /login | URL no longer matches /login, localStorage `molecule:auth:accessToken` set | error toast, still on /login |
| `getByRole('link', { name: /^sign up$/i })`                                     | link           | navigates to /signup                                      | URL = /signup                                                              | otherwise                    |
| `getByRole('link', { name: /privacy/i })`                                       | link           | navigates to /privacy                                     | URL = /privacy                                                             | otherwise                    |
| `getByRole('link', { name: /terms/i })`                                         | link           | navigates to /terms                                       | URL = /terms                                                               | otherwise                    |
| `getByRole('button', { name: /language/i })`                                    | button         | opens language switcher                                   | language popover visible                                                   | no popover                   |
| Bad credentials submit                                                          | submit         | POST /api/sessions returns 401                            | error message visible, URL stays /login, no token saved                    | redirect away                |

## Hidden surfaces opened from this page

| trigger         | what it opens             | elements inside                                                                                 |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| Language button | language switcher popover | language buttons (English/Español/etc.); pressing one updates `<html lang>` and persists choice |

## Network calls expected during normal use

| trigger              | method | path          | what request body or query is expected                         |
| -------------------- | ------ | ------------- | -------------------------------------------------------------- |
| valid login submit   | POST   | /api/sessions | body: `{ email, password }`; 201 returns access/refresh tokens |
| invalid login submit | POST   | /api/sessions | body: `{ email, password }`; 401 with error                    |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every menu/popover opened
- [x] form has every field documented (email + password + submit + validation)
- [x] every link href / route documented
- [x] every dynamic state (default / submitting / error) covered
- [x] all rows have a corresponding test in `e2e/login.spec.ts`
