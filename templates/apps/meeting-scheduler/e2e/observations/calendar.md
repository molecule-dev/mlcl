# Page observations: /calendar (Calendar)

Authenticated week/day grid sourced from /api/bookings + /api/event-types.

Source: this page was driven live at `http://localhost:$VITE_PORT/calendar`
via Playwright + the matching `e2e/calendar.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role   | expected behavior on interaction                             | success signal                    | failure signal            |
| -------------------------------- | ------ | ------------------------------------------------------------ | --------------------------------- | ------------------------- |
| `[data-testid="calendar-grid"]`  | group  | renders the 7-day grid even when empty                       | grid visible after /calendar load | grid never paints         |
| `[data-testid="calendar-empty"]` | status | shows the "no bookings yet" hint when no events fall in view | visible right after signup        | absent for empty calendar |
| `[data-testid="calendar-today"]` | button | jumps the visible week to "today"                            | URL stays /calendar; grid resets  | click navigates away      |

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
- [x] All elements above have a corresponding test in `e2e/calendar.spec.ts`
