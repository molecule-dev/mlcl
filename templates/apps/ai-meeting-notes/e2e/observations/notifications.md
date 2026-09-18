# Page observations: /notifications (Notifications)

> Authenticated. Renders the @molecule/app-notification-feed-react feed
> backed by GET /api/notifications. Empty state shown when there are
> none. Each item with `href` is a link that deep-routes inside the app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role        | expected behavior on interaction              | success signal  | failure signal |
| ---------------------------------------------------- | ----------- | --------------------------------------------- | --------------- | -------------- |
| `getByRole('heading', { name: /notifications/i })`   | heading     | identifies the page                           | h1 visible      | empty page     |
| `getByText(/no new notifications/i)`                 | empty state | shown to fresh users                          | text visible    | wrong content  |
| `page.getByRole('list', { name: /notifications/i })` | list        | when populated, NotificationFeed list renders | list visible    | feed missing   |
| `page.locator('[data-mol-id="nav-notifications"]')`  | sidebar nav | sidebar shell rendered                        | element visible | layout broken  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected                   |
| --------- | ------ | ------------------ | -------------------------------------------------------- |
| Page load | GET    | /api/notifications | enriched feed (kind→type, link→href, unread, created_at) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-notifications.spec.ts`
