# Page observations: /announcement/:id (AnnouncementDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated, with a seeded announcement (use `seedAnnouncement(page, token)`)

## Elements

| selector / accessible name                       | role       | expected behavior on interaction                                            | success signal                                                       | failure signal                            |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `<h1>` announcement title                        | text       | renders the seeded title                                                    | title text visible                                                   | "Not found"                               |
| announcement body                                | text       | renders body text                                                           | body visible                                                         | empty                                     |
| `getByRole("button", { name: /Acknowledge/i })`  | button     | POST `/api/announcements/:id/acknowledge`, button changes to "Acknowledged" | label flips, GET `/me/acknowledgments` includes this id on next read | label unchanged                           |
| `textarea[placeholder*=reply]`                   | textbox    | accept comment text                                                         | value reflects typed text                                            | empty                                     |
| `getByRole("button", { name: /Reply              | Post       | Send/i })`                                                                  | button                                                               | POST `/api/comments/:id`, comment renders | comment visible AND survives reload | nothing |
| `getByRole("link", { name: /Feed                 | Back/i })` | link `/feed`                                                                | back to feed                                                         | URL `/feed`                               | stays                               |
| `getByRole("button", { name: /Toggle theme/i })` | button     | flips theme                                                                 | `data-mol-mode` flips                                                | unchanged                                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                                 | what request body or query is expected |
| ----------------- | ------ | ------------------------------------ | -------------------------------------- |
| Page load         | GET    | `/api/announcements/:id`             | returns full announcement              |
| Page load         | GET    | `/api/comments/:id`                  | returns thread comments                |
| Click Acknowledge | POST   | `/api/announcements/:id/acknowledge` | empty body                             |
| Submit reply      | POST   | `/api/comments/:id`                  | `{ body }`                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/announcement__id.spec.ts`
