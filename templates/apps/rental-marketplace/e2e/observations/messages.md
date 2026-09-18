# Page observations: /messages (Messages inbox)

Linear list of message threads from `GET /api/messages/threads`. Demo
seed adds one host welcome thread for new users. Each thread is a link
to `/messages/:id`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role   | expected behavior on interaction | success signal                                | failure signal    |
| --------------------------------------------------------------- | ------ | -------------------------------- | --------------------------------------------- | ----------------- |
| Thread row link `page.locator('a[href^="/messages/"]').first()` | link   | navigate to /messages/:id        | URL becomes /messages/<uuid>, thread renders  | navigation broken |
| Empty-state friendly text (when threads.length === 0)           | static | rendered when no threads         | "No conversations yet." visible               | wrong copy        |
| Listing eyebrow on populated thread row                         | text   | shows associated listing title   | matches the demo-seeded listing               | wrong title       |
| New-badge for unread `getByText(/new/i).first()`                | text   | indicates thread.unread          | visible badge when unread, hidden once viewed | persistent badge  |
| Author name + last-message preview                              | text   | displays from API payload        | text matches latest message                   | wrong copy        |

## Hidden surfaces opened from this page

(none — flat list)

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| initial mount | GET    | /api/messages/threads | 200 with `{ data: Thread[] }`          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/messages.spec.ts`
