# Page observations: /notifications (Notifications)

> Authenticated inbox surface. On mount: GET /api/notifications. The
> first read for a brand-new account triggers a server-side lazy-seed
> of welcome rows. "Mark all as read" PATCHes /api/notifications/mark-all-read.
> Spec: e2e/10-notifications.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role      | expected behavior on interaction  | success signal                             | failure signal   |
| ---------------------------------------- | --------- | --------------------------------- | ------------------------------------------ | ---------------- |
| `[data-testid="notifications-list"]`     | list      | renders one li per notification   | populated after lazy seed                  | empty            |
| `[data-testid="notifications-mark-all"]` | button    | PATCHes mark-all-read             | all rows show data-read=true; GET reflects | no change        |
| `[data-testid="notifications-empty"]`    | container | empty state when no unread        | visible only when zero                     | hidden otherwise |
| `[data-testid="notifications-eyebrow"]`  | text      | "Inbox" eyebrow above the heading | visible                                    | absent           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger        | method | path                             | expected body                          |
| -------------- | ------ | -------------------------------- | -------------------------------------- |
| Page load      | GET    | /api/notifications               | { data: [...] } (lazy-seeded if empty) |
| Mark all click | PATCH  | /api/notifications/mark-all-read | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-notifications.spec.ts`
