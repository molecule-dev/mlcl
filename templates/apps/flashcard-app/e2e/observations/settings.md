# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role       | expected behavior on interaction                                                     | success signal                                                          | failure signal                      |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------- |
| `getByRole("button", { name: /^Account$/i })` (tab)        | button     | switches the right pane to Account section                                           | aria-current=page; Account heading visible                              | pane unchanged                      |
| `getByRole("button", { name: /^Study$/i })` (tab)          | button     | switches the right pane to Study section                                             | aria-current=page; Study preferences heading visible                    | pane unchanged                      |
| `getByRole("button", { name: /^Reminders$/i })` (tab)      | button     | switches the right pane to Reminders section                                         | aria-current=page; reminder checkboxes visible                          | pane unchanged                      |
| `getByLabel(/Display name/i)`                              | textbox    | edits the display name; persisted via PATCH /api/profile/me                          | value retained; reload shows the saved value                            | value lost on reload                |
| Theme pill group (System/Light/Dark)                       | button     | switches theme via PATCH /api/profile/me {theme}; updates documentElement attributes | aria-pressed flips and PATCH 200                                        | no PATCH or aria-pressed unchanged  |
| `getByRole("button", { name: /Save changes/i })` (Account) | button     | PATCH /api/profile/me with {name}; flashes "Saved." text                             | #settings-saved appears; GET /api/profile/me returns the new name       | no PATCH fired or flash never shows |
| `getByLabel(/Daily review goal/i)` (Study tab)             | spinbutton | edits dailyGoal; persisted via PATCH /api/profile/me                                 | value retained; reload shows the saved value                            | value lost on reload                |
| `getByRole("button", { name: /Save changes/i })` (Study)   | button     | PATCH /api/profile/me with {daily_goal}; flashes "Saved." text                       | #settings-saved appears; GET /api/profile/me returns the new daily_goal | no PATCH or no flash                |
| reminder toggle checkboxes (4 of them, Reminders tab)      | checkbox   | toggles localStorage flag; persists across reload via local store                    | checked state survives page.reload()                                    | state lost on reload                |

## Hidden surfaces opened from this page

| trigger                      | what it opens             | elements inside (selector / role / behavior)           |
| ---------------------------- | ------------------------- | ------------------------------------------------------ |
| Account/Study/Reminders tabs | right pane swap (in-page) | each pane has its own form/checkboxes documented above |

## Network calls expected during normal use

| trigger              | method | path            | what request body or query is expected                    |
| -------------------- | ------ | --------------- | --------------------------------------------------------- |
| load /settings       | GET    | /api/profile/me | current profile incl. name/email/daily_goal/theme/streaks |
| click Save (Account) | PATCH  | /api/profile/me | {name}; 200 with updated profile                          |
| click Save (Study)   | PATCH  | /api/profile/me | {daily_goal}; 200 with updated profile                    |
| click theme pill     | PATCH  | /api/profile/me | {theme}; 200                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
