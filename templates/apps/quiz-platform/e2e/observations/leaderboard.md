# Page observations: /leaderboard

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                           | role             | expected behavior on interaction                   | success signal                                              | failure signal      |
| ---------------------------------------------------- | ---------------- | -------------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| `getByTestId('leaderboard')`                         | landmark `<div>` | rendered                                           | element visible                                             | missing             |
| `getByRole('link', { name: /sparq home/i })`         | link             | navigate to /                                      | URL = /                                                     | otherwise           |
| `getByRole('button', { name: /toggle theme/i })`     | button           | flips data-theme                                   | data-theme attr changes                                     | unchanged           |
| `getByRole('button', { name: /open user menu/i })`   | button           | opens user-menu popover                            | menu items visible                                          | no popover          |
| `getByRole('heading', { name: /top quizmasters/i })` | h1               | rendered                                           | heading visible                                             | missing             |
| Empty state ("No plays on the board yet")            | section          | shown when /api/leaderboard/global returns `[]`    | empty card visible after load                               | missing             |
| Podium section                                       | section          | shown when leaderboard has 1+ row                  | top 3 by total_score render in podium order (1st in middle) | missing/wrong order |
| Full ranking list                                    | section          | shows ranks 4..N with `<LeaderboardRow>` per entry | one row per entry beyond podium                             | wrong count         |
| `getByRole('link', { name: /privacy/i })`            | link             | /privacy                                           | URL changes                                                 | otherwise           |
| `getByRole('link', { name: /terms/i })`              | link             | /terms                                             | URL changes                                                 | otherwise           |
| `getByRole('button', { name: /language/i })`         | button           | language switcher                                  | popover visible                                             | no popover          |

## Network calls expected during normal use

| trigger   | method | path                    | body / query                              |
| --------- | ------ | ----------------------- | ----------------------------------------- |
| page load | GET    | /api/leaderboard/global | 200 returns `LeaderboardEntry[]` (sorted) |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] empty state covered
- [x] populated state covered (after a quiz play populates leaderboard)
- [x] header + nav documented
- [x] all rows have a corresponding test in `e2e/leaderboard.spec.ts`
