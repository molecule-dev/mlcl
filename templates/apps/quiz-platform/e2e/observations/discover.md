# Page observations: /discover

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated; the layout shell shows the user-menu button.

## Elements

| selector / accessible name                                                 | role      | expected behavior on interaction                    | success signal                                                        | failure signal  |
| -------------------------------------------------------------------------- | --------- | --------------------------------------------------- | --------------------------------------------------------------------- | --------------- |
| `getByRole('link', { name: /sparq home/i })`                               | link      | navigate to /                                       | URL = /                                                               | otherwise       |
| `getByRole('button', { name: /toggle theme/i })`                           | button    | flips data-theme                                    | data-theme attr changes                                               | unchanged       |
| `getByRole('button', { name: /open user menu/i })`                         | button    | opens user-menu popover                             | menu items "Profile", "Settings", "Sign out", "Notifications" visible | no popover      |
| `getByRole('searchbox', { name: /search quizzes/i })` (input[type=search]) | searchbox | accepts text and submits                            | URL or visible quiz cards filter                                      | unchanged       |
| `getByRole('button', { name: /^search$/i })`                               | submit    | filters quiz cards by title (client-side substring) | only matching cards remain                                            | nothing changes |
| Category chip "All"                                                        | button    | filter category=all                                 | "All" chip aria-pressed/active; cards include all categories          | unchanged       |
| Category chip "Science"                                                    | button    | filter category=science                             | only science cards visible                                            | unchanged       |
| Category chip "Geography"                                                  | button    | filter category=geography                           | only geography cards visible                                          | unchanged       |
| Category chip "History"                                                    | button    | filter category=history                             | only history cards visible                                            | unchanged       |
| Category chip "Arts & Music"                                               | button    | filter category=arts                                | only arts cards visible                                               | unchanged       |
| Category chip "Sports"                                                     | button    | filter category=sports                              | only sports cards visible                                             | unchanged       |
| Category chip "Pop Culture"                                                | button    | filter category=pop                                 | only pop cards visible                                                | unchanged       |
| QuizCard "Play" link                                                       | link      | navigate to /quiz/{id}                              | URL matches `/quiz/[uuid]`                                            | otherwise       |
| `getByRole('link', { name: /see your library/i })`                         | link      | navigates to /my-quizzes                            | URL = /my-quizzes                                                     | otherwise       |
| Curated collection chip "Classroom Starters"                               | button    | filters list to that collection                     | matching cards visible                                                | unchanged       |
| Curated collection chip "Game Night Hits"                                  | button    | filters list to that collection                     | matching cards (or empty card) visible                                | unchanged       |
| Curated collection chip "Geography Tournaments"                            | button    | filters list to that collection                     | matching cards visible                                                | unchanged       |
| `getByRole('link', { name: /privacy/i })`                                  | link      | /privacy                                            | URL changes                                                           | otherwise       |
| `getByRole('link', { name: /terms/i })`                                    | link      | /terms                                              | URL changes                                                           | otherwise       |
| `getByRole('button', { name: /language/i })`                               | button    | language switcher                                   | popover visible                                                       | no popover      |

## Hidden surfaces opened from this page

| trigger         | what it opens     | elements inside                                                                                                                                               |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open user menu  | popover           | "Profile" link → `/u/{username}`; "Settings" link → `/settings`; "Notifications" link → `/notifications`; "Sign out" button (clears bearer, navigates to `/`) |
| Language button | language switcher | language buttons; selecting persists                                                                                                                          |

## Network calls expected during normal use

| trigger                 | method | path                        | body / query                                           |
| ----------------------- | ------ | --------------------------- | ------------------------------------------------------ |
| page load               | GET    | /api/quizzes                | 200 returns published quizzes (array)                  |
| sign-out from user menu | DELETE | /api/sessions/{token-or-id} | 204 — clears bearer; subsequent /api/users returns 401 |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every category chip + collection chip enumerated
- [x] hover/popover state opened (user menu, language)
- [x] search box filters as expected
- [x] empty-state covered (no published quizzes for the user)
- [x] all rows have a corresponding test in `e2e/discover.spec.ts`
