# Page observations: /notifications (Notifications)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                 | success signal                     | failure signal              |
| -------------------------------------------------------------- | ------- | ------------------------------------------------ | ---------------------------------- | --------------------------- |
| `getByRole("heading", { name: /^Notifications$/i, level: 1 })` | heading | renders Notifications h1                         | visible h1                         | missing heading             |
| empty-state text "No notifications."                           | text    | shown when /api/notifications returns []         | visible empty state for fresh user | spinner stuck or wrong text |
| feed list (NotificationFeed) when any                          | list    | shows unread items after POST /api/notifications | list contains the seeded title     | feed not updated after POST |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger             | method | path               | what request body or query is expected |
| ------------------- | ------ | ------------------ | -------------------------------------- |
| load /notifications | GET    | /api/notifications | list of notifications for the user     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
