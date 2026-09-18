# Page observations: /notifications (Notifications)

> Captured authenticated. Renders @molecule/app-notification-feed-react
> with rows from /api/notifications. Empty-state copy when bucket is empty.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                                   | role     | expected behavior on interaction                                      | success signal             | failure signal        |
| ------------------------------------------------------------ | -------- | --------------------------------------------------------------------- | -------------------------- | --------------------- |
| `getByRole('heading', { name: /notifications/i, level: 1 })` | heading  | renders the page title                                                | visible                    | missing               |
| `page.getByText(/no new notifications/i)`                    | text     | empty-state copy when feed is empty                                   | visible when empty         | hidden when populated |
| `page.locator('[role="list"]').first()`                      | list     | renders the @molecule/app-notification-feed-react list when populated | role=list                  | missing               |
| `page.locator('[role="listitem"]').first()`                  | listitem | renders a notification row when feed is populated                     | ≥1 listitem when populated | empty                 |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside |
| ------------------ | ------------- | --------------- |
| (none — flat feed) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path               | expected body                       |
| --------- | ------ | ------------------ | ----------------------------------- |
| Page load | GET    | /api/notifications | array of notifications for the user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
