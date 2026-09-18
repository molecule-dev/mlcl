# Page observations: /feed (Feed)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role                         | expected behavior on interaction | success signal                                        | failure signal                        |
| ------------------------------------------------------------------- | ---------------------------- | -------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `getByRole("link", { name: /^Clarion/i })` (sidebar brand)          | link `/feed`                 | stays on feed                    | URL `/feed`                                           | navigates away                        |
| `getByRole("link", { name: /Feed/i })` (sidebar)                    | link `/feed`                 | stays on feed                    | URL `/feed`                                           | navigates away                        |
| `getByRole("link", { name: /New announcement/i })` (sidebar)        | link `/compose`              | navigates to composer            | URL `/compose`                                        | stays                                 |
| `getByRole("link", { name: /My acknowledgments/i })`                | link `/my-acknowledgments`   | navigates                        | URL matches                                           | stays                                 |
| `getByRole("link", { name: /Notifications/i })`                     | link `/notifications`        | navigates                        | URL matches                                           | stays                                 |
| `getByRole("link", { name: /Search/i })`                            | link `/search`               | navigates                        | URL matches                                           | stays                                 |
| `getByRole("link", { name: /People/i })`                            | link `/people`               | navigates                        | URL matches                                           | stays                                 |
| `getByRole("link", { name: /Analytics/i })`                         | link `/analytics`            | navigates                        | URL matches                                           | stays                                 |
| sidebar channel link e.g. `getByRole("link", { name: /company/i })` | link `/feed?channel=company` | filter feed to that channel      | URL has `?channel=company`, link active class applied | URL unchanged                         |
| `getByRole("link", { name: /Profile/i })`                           | link `/profile`              | navigates                        | URL `/profile`                                        | stays                                 |
| `getByRole("link", { name: /Settings/i })`                          | link `/settings`             | navigates                        | URL `/settings`                                       | stays                                 |
| `getByRole("button", { name: /Sign out                              | SIGN OUT/i })`               | button                           | clears auth, navigates to `/login` or `/`             | URL `/login` AND localStorage cleared | still authed |
| `getByRole("button", { name: /Toggle theme/i })`                    | button                       | flips theme                      | `data-mol-mode` flips, persists across reload         | unchanged                             |
| filter chip `getByRole("button", { name: /Urgent/i })`              | button                       | toggles `priority=urgent` filter | only urgent announcements remain visible              | non-urgent still visible              |
| filter chip `getByRole("button", { name: /All/i })`                 | button                       | clears priority filter           | all announcements visible                             | nothing                               |
| filter chip `getByRole("button", { name: /Pinned/i })`              | button                       | shows only pinned                | only pinned cards visible                             | nothing                               |
| announcement card `getByRole("link", { name: /<title>/i })`         | link `/announcement/:id`     | open detail                      | URL `/announcement/<uuid>`                            | stays                                 |
| `getByTestId("feed-empty-state")` (first signup)                    | text                         | shown on empty workspace         | visible when no announcements                         | not present                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                                    | what request body or query is expected |
| --------- | ------ | --------------------------------------- | -------------------------------------- |
| Page load | GET    | `/api/announcements`                    | list announcements                     |
| Page load | GET    | `/api/categories`                       | list channels (auto-seeded)            |
| Page load | GET    | `/api/team`                             | list team members                      |
| Page load | GET    | `/api/announcements/me/acknowledgments` | list current user's acks               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/feed.spec.ts`
