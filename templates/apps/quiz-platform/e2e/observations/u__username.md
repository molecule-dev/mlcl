# Page observations: /u/:username (Profile)

> Filled from a real Playwright walk of the running app. Logged in user
> visits `/u/<their-own-username>` (the username is derived from email
> local-part). Page renders the user's published quizzes; if none, an
> "Nothing published yet" empty state with a "Start building →" link.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                        | success signal                                          | failure signal    |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------- | ------------------------------------------------------- | ----------------- |
| `getByRole('link', { name: 'Sparq' }).first()`                 | link    | header brand → /                                        | URL = /                                                 | otherwise         |
| `getByRole('button', { name: /toggle theme/i })`               | button  | flips html data-theme                                   | data-theme attribute toggles                            | unchanged         |
| `getByRole('button', { name: /open user menu/i })`             | button  | opens user-menu popover                                 | menu opens with Profile/Settings/Notifications/Sign out | unchanged         |
| `[data-testid=profile-display-name]`                           | heading | shows the signed-in user's display name                 | textContent matches signup name                         | placeholder shown |
| `[data-testid=profile-edit]` (Edit profile link)               | link    | go to /settings                                         | URL = /settings                                         | otherwise         |
| `[data-testid=profile-create]` (Build a quiz link)             | link    | go to /my-quizzes                                       | URL = /my-quizzes                                       | otherwise         |
| QuizStatsRow "Published quizzes" stat                          | text    | shows count = number of published quizzes for this user | count matches list length                               | mismatch          |
| QuizStatsRow "Total plays" stat                                | text    | sums play_count across published quizzes                | matches sum                                             | otherwise         |
| `getByRole('link', { name: /start building/i })` (empty state) | link    | go to /my-quizzes                                       | URL = /my-quizzes                                       | otherwise         |
| Footer `getByRole('link', { name: /privacy policy/i })`        | link    | /privacy                                                | URL changes                                             | otherwise         |

## Hidden surfaces opened from this page

| trigger        | what it opens | elements inside (selector / role / behavior)                                                                                                                  |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open user menu | popover       | "Profile" link → `/u/{username}`; "Settings" link → `/settings`; "Notifications" link → `/notifications`; "Sign out" button (clears bearer, navigates to `/`) |

## Network calls expected during normal use

| trigger                 | method | path                   | what request body or query is expected                                    |
| ----------------------- | ------ | ---------------------- | ------------------------------------------------------------------------- |
| page load (own profile) | GET    | /api/quizzes?mine=true | 200 returns [{id,title,status,…}], filtered to status=published in the UI |

## Coverage check (final pass)

- [x] navigated, snapshot, list, re-navigate, re-list — no new elements
- [x] One full re-pass added nothing new
- [x] Empty state ("Nothing published yet") observed when user has no published quizzes
- [x] Populated state observed (after publishing a quiz, hero shows incremented "Published quizzes" stat)
- [x] Header user-menu popover opened and contents listed
- [x] All elements above have a corresponding test in `e2e/u__username.spec.ts`
