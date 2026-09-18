# Page observations: /my-quizzes

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                        | role       | expected behavior on interaction                                                                           | success signal                                                   | failure signal             |
| ----------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------- |
| `getByRole('link', { name: /sparq home/i })`                      | link       | navigate to /                                                                                              | URL = /                                                          | otherwise                  |
| `getByRole('button', { name: /toggle theme/i })`                  | button     | flips data-theme                                                                                           | data-theme attr changes                                          | unchanged                  |
| `getByRole('button', { name: /open user menu/i })`                | button     | opens user-menu popover                                                                                    | menu items visible                                               | no popover                 |
| `getByRole('button', { name: /new quiz/i })` (text "addNew quiz") | button     | POST /api/quizzes (draft), then navigate to /quiz/{id}/edit                                                | URL = /quiz/{uuid}/edit, builder shell visible                   | error toast, URL unchanged |
| `getByRole('button', { name: /created by me/i })`                 | tab button | filter list to mine=true                                                                                   | only my quizzes visible                                          | unchanged                  |
| `getByRole('button', { name: /^discover$/i })`                    | tab button | filter list to all (or navigate to /discover)                                                              | switches view                                                    | unchanged                  |
| empty-state link "Build your first quiz"                          | link       | navigates back to /my-quizzes (no-op when zero quizzes — focuses CTA) or to /quiz/{id}/edit when populated | matches behavior                                                 | otherwise                  |
| Quiz row "Edit" link (per-quiz, when populated)                   | link       | /quiz/{id}/edit                                                                                            | URL changes                                                      | otherwise                  |
| Quiz row "Delete" button (per-quiz, when populated)               | button     | DELETE /api/quizzes/{id}; row disappears                                                                   | row removed from DOM, GET /api/quizzes?mine=true count decreases | row remains                |
| `getByRole('link', { name: /privacy/i })`                         | link       | /privacy                                                                                                   | URL changes                                                      | otherwise                  |
| `getByRole('link', { name: /terms/i })`                           | link       | /terms                                                                                                     | URL changes                                                      | otherwise                  |
| `getByRole('button', { name: /language/i })`                      | button     | language switcher                                                                                          | popover visible                                                  | no popover                 |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside                               |
| --------------- | ------------- | --------------------------------------------- |
| Open user menu  | popover       | Profile / Settings / Notifications / Sign out |
| Language button | popover       | language buttons                              |

## Network calls expected during normal use

| trigger                   | method | path                   | body / query                                                                |
| ------------------------- | ------ | ---------------------- | --------------------------------------------------------------------------- |
| page load (Created by me) | GET    | /api/quizzes?mine=true | 200 returns user's quizzes                                                  |
| switch to Discover tab    | GET    | /api/quizzes           | 200 returns all published                                                   |
| New quiz button           | POST   | /api/quizzes           | `{ title, category }`; 201 returns `{ id }`, then route → `/quiz/{id}/edit` |
| Delete quiz row           | DELETE | /api/quizzes/{id}      | 204; subsequent GET ?mine=true reflects removal (read-after-write)          |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] empty + populated states covered
- [x] tab switching covered
- [x] new quiz round-trip covered
- [x] delete confirmed via GET re-fetch
- [x] all rows have a corresponding test in `e2e/my-quizzes.spec.ts`
