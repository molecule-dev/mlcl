# Page observations: /notifications (Notifications)

List of notifications from `GET /api/notifications`. Each row may be
unread (highlighted) and clickable to mark it read; "Mark all read" CTA
hits `POST /api/notifications/read-all`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seeds two notifications)

## Elements

| selector / accessible name                                | role   | expected behavior on interaction                               | success signal                           | failure signal    |
| --------------------------------------------------------- | ------ | -------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| `getByRole('button', { name: /mark all (as )?read/i })`   | button | POST /api/notifications/read-all → all rows lose unread badge  | unread count becomes 0 in subsequent GET | rows still unread |
| Individual notification row `getByRole('button').first()` | button | POST /api/notifications/:id/read → that row loses unread state | row read=true on next GET                | still unread      |
| Notification row link to /listings, /bookings, etc.       | link   | navigate to deep-linked target                                 | URL changes to e.g. /listings/<id>       | no navigation     |
| Empty-state copy when no notifications                    | text   | shown only when /api/notifications returns []                  | renders friendly empty                   | wrong copy        |

## Hidden surfaces opened from this page

(none — flat list)

## Network calls expected during normal use

| trigger              | method | path                        | what request body or query is expected         |
| -------------------- | ------ | --------------------------- | ---------------------------------------------- |
| initial mount        | GET    | /api/notifications          | 200 with `{ data: Notification[] }`            |
| mark-all-read        | POST   | /api/notifications/read-all | 200 — all rows now read=true on subsequent GET |
| individual mark-read | POST   | /api/notifications/:id/read | 200 — that row read=true on subsequent GET     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
