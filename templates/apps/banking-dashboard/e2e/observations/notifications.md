# Page observations: /notifications (Notifications)

Source: live walk via Playwright + e2e/notifications.spec.ts.
The feed is server-derived from recent transactions, completed
transfers, and ready statements.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction                      | success signal                   | failure signal                        |
| ------------------------------------------------------------ | ------- | ----------------------------------------------------- | -------------------------------- | ------------------------------------- |
| `getByRole('heading', { name: /notifications/i, level: 1 })` | heading | h1 renders                                            | visible                          | missing                               |
| Eyebrow "Activity feed"                                      | text    | uppercase eyebrow above h1                            | visible                          | missing                               |
| Subheading "Real-time alerts…"                               | text    | descriptive subline                                   | visible                          | missing                               |
| Empty state heading "You're all caught up"                   | text    | renders for a brand-new user with zero derived events | visible with empty-state graphic | wrong copy / fake list                |
| Unread-count chip (`{{count}} unread`)                       | text    | renders count of items with unread=true               | matches API                      | wrong                                 |
| Security-count chip (`{{count}} security`)                   | text    | renders only when security events present             | matches API                      | wrong                                 |
| Transactions-count chip (`{{count}} transactions`)           | text    | renders only when transaction items present           | matches API                      | wrong                                 |
| `NotificationFeed` items                                     | list    | one entry per server-derived feed item                | rows visible after seeding       | nothing renders even with seeded data |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------- | ------------- | -------------------------------------------- |
| (none — read-only feed; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected            |
| ------------ | ------ | ------------------ | ------------------------------------------------- |
| initial load | GET    | /api/notifications | 200 with `{ data:[…], total }` derived feed items |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
