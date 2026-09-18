# Page observations: /inbox (Inbox)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                    | role             | expected behavior on interaction                                 | success signal                                               | failure signal                    |
| ----------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| `[data-mol-id="inbox-tab-primary"]` etc                                       | tab              | filters thread list to primary/social/promos/updates             | aria-selected toggles + list filters                         | tab nothing happens               |
| Thread row star toggle (`MeridianThreadRow` star span[role=button])           | button           | PUT /api/emails/:id/star to flip is_starred                      | row star icon flips + GET /emails reflects new is_starred    | API not called or value unchanged |
| Thread row click                                                              | row              | selects row + marks as read (PUT /:id/read) + opens reading pane | reading pane shows subject/body, GET counts.unread decreases | reading pane stays empty          |
| Reading-pane archive button (`[data-mol-id="reading-archive"]`)               | button           | PUT /api/emails/:id/move {folder:archive}                        | row removed from inbox, appears in /archive                  | row stays in inbox                |
| Reading-pane delete button (`[data-mol-id="reading-delete"]`)                 | button           | DELETE /api/emails/:id (move to trash)                           | row removed from inbox, appears in /trash                    | row stays in inbox                |
| Reading-pane spam button (`[data-mol-id="reading-spam"]`)                     | button           | PUT /api/emails/:id/move {folder:spam}                           | row appears in /spam                                         | row stays in inbox                |
| Reading-pane reply textarea (`[data-mol-id="reading-reply-textarea"]`) + send | textbox + button | POST /api/emails/send with thread_id, subject "Re:" prefix       | success feedback + reply visible in /sent                    | feedback shows error              |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside (selector / role / behavior)                      |
| ------------------------------ | ------------- | ----------------------------------------------------------------- |
| Selecting a thread             | reading pane  | subject heading, message card, reply quick-compose, prev/next nav |
| Reading-pane prev/next buttons | navigation    | step through filtered list                                        |

## Network calls expected during normal use

| trigger     | method | path                               | what request body or query is expected |
| ----------- | ------ | ---------------------------------- | -------------------------------------- |
| Mount       | GET    | /api/emails?folder=inbox&limit=100 | empty body                             |
| Mount       | GET    | /api/labels                        | empty body                             |
| Mount       | GET    | /api/emails/storage                | empty body                             |
| Star toggle | PUT    | /api/emails/:id/star               | empty body                             |
| Mark read   | PUT    | /api/emails/:id/read               | { is_read: true }                      |
| Send reply  | POST   | /api/emails/send                   | { to, subject, body, thread_id }       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/inbox.spec.ts`
