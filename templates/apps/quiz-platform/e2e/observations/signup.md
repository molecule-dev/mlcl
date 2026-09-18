# Page observations: /signup

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                 | role           | expected behavior on interaction                           | success signal                                                                     | failure signal                |
| -------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| `getByRole('link', { name: /sparq home/i })`                               | link           | navigate to /                                              | URL = /                                                                            | otherwise                     |
| `getByRole('button', { name: /toggle theme/i })`                           | button         | flips data-theme                                           | data-theme attr changes                                                            | unchanged                     |
| `getByRole('textbox', { name: /your name/i })`                             | input text     | accept text                                                | value reflects typed                                                               | missing                       |
| `getByRole('textbox', { name: /email/i })`                                 | input email    | accept text                                                | value reflects typed                                                               | missing                       |
| `getByRole('textbox', { name: /password/i })` (DOM `input[type=password]`) | input password | accept text                                                | DOM value matches typed                                                            | missing                       |
| `getByRole('button', { name: /^sign up$/i })`                              | submit         | POST /users (201), then POST /api/sessions; persists token | URL no longer matches /signup, `molecule:auth:accessToken` present in localStorage | still on /signup, error toast |
| Submit with already-used email                                             | submit         | POST /users returns 409 (conflict)                         | error visible, URL stays on /signup                                                | redirect away                 |
| `getByRole('link', { name: /^sign in$/i })`                                | link           | navigates to /login                                        | URL = /login                                                                       | otherwise                     |
| `getByRole('link', { name: /privacy/i })`                                  | link           | navigates to /privacy                                      | URL = /privacy                                                                     | otherwise                     |
| `getByRole('link', { name: /terms/i })`                                    | link           | navigates to /terms                                        | URL = /terms                                                                       | otherwise                     |
| `getByRole('button', { name: /language/i })`                               | button         | opens language switcher                                    | popover visible                                                                    | no popover                    |

## Hidden surfaces opened from this page

| trigger         | what it opens             | elements inside                      |
| --------------- | ------------------------- | ------------------------------------ |
| Language button | language switcher popover | language buttons; selecting persists |

## Network calls expected during normal use

| trigger                                 | method | path          | body / query                                           |
| --------------------------------------- | ------ | ------------- | ------------------------------------------------------ |
| valid signup submit                     | POST   | /api/users    | body: `{ name, email, password }`; 201 returns user id |
| valid signup submit (after user create) | POST   | /api/sessions | body: `{ email, password }`; 201 returns tokens        |
| duplicate email submit                  | POST   | /api/users    | 409 conflict                                           |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every menu opened
- [x] form has every field (name, email, password) + submit + duplicate-email error documented
- [x] every link href documented
- [x] every dynamic state (default / submitting / duplicate-email error) covered
- [x] all rows have a corresponding test in `e2e/signup.spec.ts`
