# Page observations: /quiz/:id (QuizDetail)

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated. URL contains a real quiz UUID. Use `createQuizViaApi(page)` then add a question via API to populate.

## Elements

| selector / accessible name                         | role             | expected behavior on interaction                                                              | success signal                             | failure signal           |
| -------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------ |
| `getByTestId('quiz-detail')`                       | landmark `<div>` | rendered after load                                                                           | element visible                            | "Loading quiz…" persists |
| `getByTestId('quiz-title')`                        | h1               | shows quiz.title                                                                              | visible text matches API value             | mismatch                 |
| `getByRole('link', { name: /sparq home/i })`       | link             | navigate to /                                                                                 | URL = /                                    | otherwise                |
| `getByRole('button', { name: /toggle theme/i })`   | button           | flips data-theme                                                                              | data-theme attr changes                    | unchanged                |
| `getByRole('button', { name: /open user menu/i })` | button           | opens user-menu popover                                                                       | popover visible                            | missing                  |
| `getByTestId('play-solo')`                         | link             | navigates to `/quiz/{id}/play`                                                                | URL = `/quiz/{id}/play`                    | otherwise                |
| `getByTestId('host-multiplayer')`                  | link             | navigates to `/quiz/{id}/lobby`; host page POSTs /api/sessions on mount                       | URL = `/quiz/{id}/lobby`; lobby UI visible | otherwise                |
| `getByTestId('question-preview')` (when populated) | ordered list     | shows up to 5 questions                                                                       | one `<li>` per question (capped at 5)      | wrong count              |
| Top-players card                                   | section          | shows up to 5 leaderboard entries from /api/leaderboard/quiz/{id}; "No plays yet…" when empty | matches API result                         | wrong rendering          |
| `getByRole('link', { name: /privacy/i })`          | link             | /privacy                                                                                      | URL changes                                | otherwise                |
| `getByRole('link', { name: /terms/i })`            | link             | /terms                                                                                        | URL changes                                | otherwise                |
| `getByRole('button', { name: /language/i })`       | button           | language switcher                                                                             | popover visible                            | no popover               |

## Network calls expected during normal use

| trigger   | method | path                       | body / query                     |
| --------- | ------ | -------------------------- | -------------------------------- |
| page load | GET    | /api/quizzes/{id}          | 200 returns quiz row             |
| page load | GET    | /api/questions/quiz/{id}   | 200 returns array (may be empty) |
| page load | GET    | /api/leaderboard/quiz/{id} | 200 returns array (may be empty) |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] populated + empty (no questions / no leaderboard) states covered
- [x] Play solo + Host multiplayer destinations covered
- [x] all rows have a corresponding test in `e2e/quiz-detail.spec.ts`
