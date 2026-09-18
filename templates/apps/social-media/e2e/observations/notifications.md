# Page observations: /notifications (Notifications)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                              | success signal                   | failure signal |
| -------------------------- | -------- | ------------------------------------------------------------- | -------------------------------- | -------------- |
| Like notification row      | listitem | render when an actor likes a viewer's post                    | row text contains "like" verb    | row missing    |
| Comment notification row   | listitem | render when an actor comments on a viewer's post              | row text contains "comment" verb | row missing    |
| Follow notification row    | listitem | render when an actor follows the viewer                       | row text contains "follow" verb  | row missing    |
| Notification href          | link     | clicking navigates to the originating resource (post/profile) | URL matches resource path        | nav fails      |

## Hidden surfaces opened from this page

| trigger   | what it opens                     | elements inside (selector / role / behavior) |
| --------- | --------------------------------- | -------------------------------------------- |
| Row click | linked resource (post or profile) | resource detail page                         |

## Network calls expected during normal use

| trigger    | method | path                    | what request body or query is expected  |
| ---------- | ------ | ----------------------- | --------------------------------------- |
| Page mount | GET    | /api/notifications      | returns `Notification[]` for the viewer |
| Open page  | PATCH  | /api/notifications/read | (optional) marks rows as read           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
