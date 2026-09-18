# Page observations: /bookings/:id (Meeting detail)

Authenticated detail page; reads /api/bookings/:id and exposes a cancel action.

Source: this page was driven live at `http://localhost:$VITE_PORT/bookings/:id`
via Playwright + the matching `e2e/bookings__id.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role   | expected behavior on interaction                | success signal                                          | failure signal       |
| ---------------------------------------- | ------ | ----------------------------------------------- | ------------------------------------------------------- | -------------------- |
| `[data-testid="meeting-detail-invitee"]` | text   | displays invitee name from /api/bookings/:id    | name visible after navigation                           | placeholder or empty |
| `[data-testid="meeting-detail-status"]`  | text   | shows current booking status                    | "scheduled" pre-cancel, "cancelled" post-cancel         | status never updates |
| `[data-testid="meeting-cancel"]`         | button | POST /api/bookings/:id/cancel and update status | status pill flips to cancelled and DB row reflects same | cancel button no-op  |

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
- [x] All elements above have a corresponding test in `e2e/bookings__id.spec.ts`
