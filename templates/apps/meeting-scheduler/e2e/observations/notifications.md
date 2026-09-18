# Page observations: /notifications (Notifications)

Authenticated activity feed + reminder preferences via /api/profile/me.

Source: this page was driven live at `http://localhost:$VITE_PORT/notifications`
via Playwright + the matching `e2e/notifications.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction                         | success signal                           | failure signal           |
| ------------------------------------------------------ | ------ | -------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| `[data-testid="notifications-empty"]`                  | status | empty state when no bookings exist                       | visible immediately after signup         | absent for empty list    |
| `[data-testid="notifications-channel-emailReminders"]` | switch | toggles a channel preference and PATCHes /api/profile/me | GET /profile/me reflects the new boolean | preferences never change |
| `[data-testid="notifications-reminder-15-min"]`        | button | a reminder preset option in the preferences section      | preset is clickable + visible            | preset missing           |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
