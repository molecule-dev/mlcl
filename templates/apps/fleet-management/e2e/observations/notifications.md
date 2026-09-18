# Page observations: /notifications (Operations feed)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~10 notifications across types, mix unread/read.

## Elements

| selector / accessible name                                           | role     | expected behavior on interaction                                           | success signal                         | failure signal                  |
| -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- | -------------------------------------- | ------------------------------- |
| `getByText(/^operations feed$/i)`                                    | text     | uppercase eyebrow above heading                                            | visible                                | absent                          |
| `getByRole('heading', { name: /^notifications$/i, level: 1 })`       | heading  | page heading                                                               | heading visible                        | shell error                     |
| Subheading text                                                      | text     | static "Real-time alerts on safety, maintenance, and dispatch activity."   | visible                                | absent                          |
| `getByText(/\\d+ unread/i)`                                          | text     | unread chip — count of `n.unread === true`                                 | matches "N unread"                     | absent / NaN                    |
| `getByText(/\\d+ speeding/i)` (conditional)                          | text     | rendered only when `Σ type==='speeding_alert' > 0`                         | visible only when speedingCount > 0    | rendered when 0                 |
| `getByText(/\\d+ maintenance/i)` (conditional)                       | text     | rendered only when `Σ type==='maintenance_due' > 0`                        | visible only when maintenanceCount > 0 | rendered when 0                 |
| `getByRole('list', { name: /notifications/i })` (`NotificationFeed`) | list     | renders one item per notification with icon + title + body + relative time | at least one row                       | "Failed to load notifications." |
| First notification item                                              | listitem | shows title, body, timestamp; unread items have visual indicator           | visible                                | empty                           |
| Empty-state heading "Fleet running smooth"                           | heading  | rendered only when `notifs.length === 0`                                   | visible only when empty                | rendered when items present     |

## Hidden surfaces opened from this page

| trigger                             | what it opens                                          | elements inside (selector / role / behavior)        |
| ----------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Click notification item with `href` | navigates to that href (deep link to alert/route/etc.) | depends on item type — alert detail, vehicle, route |

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| Initial mount | GET    | /api/notifications | full notification list, owner-scoped   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
