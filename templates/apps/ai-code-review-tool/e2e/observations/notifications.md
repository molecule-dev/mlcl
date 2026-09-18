# Page observations: /notifications

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/notifications`.
> Auth-required. Walked with empty inbox first, then with seeded notifications via API.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                                      | success signal                                            | failure signal                    |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| `getByRole('heading', { name: /^Notifications$/ })` | heading | renders page heading                                                  | h1 visible                                                | missing                           |
| `[data-mol-id="notif-empty"]`                       | text    | empty-state copy when no notifications                                | visible after fresh signup                                | populated rows on a fresh user    |
| `[data-mol-id="notif-unread-count"]`                | badge   | shows the unread count                                                | text matches `notifs.filter(unread).length`               | wrong number                      |
| `[data-mol-id="notif-feed"]`                        | list    | one `<li>` per visible notification                                   | rows render after seeding                                 | empty when seeded                 |
| `[data-mol-id="notif-title"]`                       | heading | per-row title (h2)                                                    | text equals seed title                                    | empty / placeholder               |
| `[data-mol-id="notif-mark-read"]`                   | button  | POST `/api/notifications/:id/read`; row flips to "Read"               | row's `data-unread="false"` AND badge text "Read" appears | nothing happens, row still unread |
| `[data-mol-id="notif-mark-all-read"]`               | button  | POST `/api/notifications/:id/read` for every unread; unread badge → 0 | unread count goes to 0 AND multiple POSTs fire            | only one POST or count not zero   |
| filter button `All`                                 | button  | sets `filter='all'`, aria-pressed=true                                | aria-pressed=true; eyebrow contains "all"                 | filter does not change            |
| filter button `Critical`                            | button  | restricts list to `kind/type` containing "critical"                   | only critical rows visible                                | wrong rows shown                  |
| filter button `Mentions`                            | button  | restricts to mentions                                                 | only mention rows visible                                 | wrong rows                        |
| filter button `PR events`                           | button  | restricts to pr_opened/pr_merged                                      | only PR rows visible                                      | wrong rows                        |
| filter button `System`                              | button  | restricts to system_message                                           | only system rows visible                                  | wrong rows                        |
| Mark-all-read survives reload                       | n/a     | new notifications still show as read after `page.reload()`            | `data-unread="false"` after reload                        | reverts to unread                 |

## Hidden surfaces opened from this page

| trigger | what it opens                          | elements inside (selector / role / behavior) |
| ------- | -------------------------------------- | -------------------------------------------- |
| (none)  | notifications page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger          | method | path                                           | what request body or query is expected |
| ---------------- | ------ | ---------------------------------------------- | -------------------------------------- |
| initial load     | GET    | `/api/notifications`                           | owner-scoped notifications list        |
| Mark as read     | POST   | `/api/notifications/:id/read`                  | `{}` → 200 with updated row            |
| Mark all as read | POST   | `/api/notifications/:id/read` (one per unread) | repeated POSTs with empty body         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms; just buttons)
- [x] Every link href / route destination is documented (per-row `Open` link if present)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
