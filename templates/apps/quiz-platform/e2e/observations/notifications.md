# Page observations: /notifications

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated. Backend seeds three sample notifications on first load.

## Elements

| selector / accessible name                           | role   | expected behavior on interaction                      | success signal                                                   | failure signal    |
| ---------------------------------------------------- | ------ | ----------------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| `getByRole('link', { name: /sparq home/i })`         | link   | navigate to /                                         | URL = /                                                          | otherwise         |
| `getByRole('button', { name: /toggle theme/i })`     | button | flips data-theme                                      | data-theme attr changes                                          | unchanged         |
| `getByRole('button', { name: /open user menu/i })`   | button | opens user-menu popover                               | menu items visible                                               | no popover        |
| `getByRole('button', { name: /mark all as read/i })` | button | POST /api/notifications/read-all; clears unread badge | all rows have `read=true`, GET /api/notifications shows 0 unread | counter unchanged |
| Tab "All"                                            | button | shows all notifications                               | both read and unread visible                                     | missing           |
| Tab "Unread"                                         | button | filters list to unread only                           | only unread visible (none after Mark all)                        | unchanged         |
| Notification card "Welcome to Sparq!"                | link   | navigates to /my-quizzes (per fixture target_url)     | URL = /my-quizzes                                                | otherwise         |
| Notification card "Tip: streak multipliers"          | link   | navigates to /discover                                | URL = /discover                                                  | otherwise         |
| Notification card "New on the leaderboard"           | link   | navigates to /leaderboard                             | URL = /leaderboard                                               | otherwise         |
| `getByRole('link', { name: /privacy/i })`            | link   | /privacy                                              | URL changes                                                      | otherwise         |
| `getByRole('link', { name: /terms/i })`              | link   | /terms                                                | URL changes                                                      | otherwise         |
| `getByRole('button', { name: /language/i })`         | button | language switcher                                     | popover visible                                                  | no popover        |

## Network calls expected during normal use

| trigger          | method | path                        | body / query                                             |
| ---------------- | ------ | --------------------------- | -------------------------------------------------------- |
| page load        | GET    | /api/notifications          | 200 returns notifications array (3 seeded for new users) |
| Mark all as read | POST   | /api/notifications/read-all | 200/204; subsequent GET shows all read                   |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] All vs Unread tab toggle covered
- [x] Mark-all-as-read confirmed via GET re-fetch (read-after-write)
- [x] each card link destination verified
- [x] all rows have a corresponding test in `e2e/notifications.spec.ts`
