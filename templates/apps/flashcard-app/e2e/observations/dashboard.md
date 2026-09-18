# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role   | expected behavior on interaction                     | success signal                          | failure signal      |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------- | --------------------------------------- | ------------------- |
| `getByRole("link", { name: /Today/i })` (sidebar)            | link   | navigates to /dashboard                              | URL stays /dashboard                    | 404 or wrong path   |
| `getByRole("link", { name: /Decks/i })` (sidebar)            | link   | navigates to /decks                                  | URL becomes /decks                      | stays on /dashboard |
| `getByRole("link", { name: /Stats/i })` (sidebar)            | link   | navigates to /stats                                  | URL becomes /stats                      | stays on /dashboard |
| `getByRole("link", { name: /Notifications/i })` (sidebar)    | link   | navigates to /notifications                          | URL becomes /notifications              | stays on /dashboard |
| `getByRole("link", { name: /Settings/i })` (sidebar)         | link   | navigates to /settings                               | URL becomes /settings                   | stays on /dashboard |
| `getByRole("button", { name: /Open user menu/i })` (sidebar) | button | opens UserMenu panel with Settings/My stats/Sign out | panel role with Sign out button visible | no panel opens      |
| "Start studying" hero CTA when no due cards                  | link   | navigates to /decks                                  | URL becomes /decks                      | stays on /dashboard |

## Hidden surfaces opened from this page

| trigger        | what it opens                | elements inside (selector / role / behavior)                                                                                         |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Open user menu | side panel (SidebarUserCard) | `getByRole("link", { name: /Settings/i })`, `getByRole("link", { name: /My stats/i })`, `getByRole("button", { name: /Sign out/i })` |

## Network calls expected during normal use

| trigger         | method | path                  | what request body or query is expected                                                       |
| --------------- | ------ | --------------------- | -------------------------------------------------------------------------------------------- |
| load /dashboard | GET    | /api/decks            | list of user decks                                                                           |
| load /dashboard | GET    | /api/reports/today    | today summary {date,total_due,reviewed_today,daily_goal,current_streak,motivational_message} |
| load /dashboard | GET    | /api/reports/overview | 30d retention/streak/reviews overview                                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
