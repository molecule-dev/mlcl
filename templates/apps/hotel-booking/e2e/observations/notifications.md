# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                                               | role             | expected behavior on interaction                                      | success signal                                                                            | failure signal                     |
| ------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /^Notifications$/, level: 1 })`            | heading          | renders the page heading                                              | heading visible                                                                           | not visible                        |
| `page.locator('[role="list"][aria-label*="Notification" i]')`            | list             | renders the notification list once the GET resolves                   | one or more `listitem` elements rendered after first reservation seeds demo notifications | empty list when expected non-empty |
| `getByRole('listitem')`                                                  | listitem (multi) | each notification renders title + body + relative time                | `count() >= 1` after seed                                                                 | empty                              |
| Notification link (`getByRole('link', { name: /Welcome to Sojourn/i })`) | link             | each notification body wraps a link to its `href` (e.g. `/account`)   | URL matches the notification's `href` after click                                         | URL stays on `/notifications`      |
| `getByRole('button', { name: /Mark all read/i })`                        | button           | POST `/api/notifications/read-all`; unread badge clears, button hides | re-fetched `/api/notifications` returns no `unread:true` rows                             | unread count unchanged             |

## Hidden surfaces opened from this page

| trigger     | what it opens              | elements inside             |
| ----------- | -------------------------- | --------------------------- |
| Empty state | "All caught up" empty card | text "No notifications yet" |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected |
| ------------- | ------ | --------------------------- | -------------------------------------- |
| Page load     | GET    | /api/notifications          | returns `{ data: [notification…] }`    |
| Mark all read | POST   | /api/notifications/read-all | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
