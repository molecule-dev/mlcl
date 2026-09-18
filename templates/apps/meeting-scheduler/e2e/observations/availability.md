# Page observations: /availability (Availability)

Authenticated page; rules persist via PUT /api/availability/bulk and reload through GET /api/availability.

Source: this page was driven live at `http://localhost:$VITE_PORT/availability`
via Playwright + the matching `e2e/availability.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role   | expected behavior on interaction                                                      | success signal                                      | failure signal          |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------- |
| `[data-testid="availability-row-Mon"]` (Mon-Fri default) | group  | Mon-Fri rules render with start/end inputs prefilled (09:00-17:00) for fresh accounts | row visible with editable times                     | row missing or disabled |
| `[data-testid="availability-toggle-Sat"]`                | button | toggling Sat enables/disables that day                                                | PUT body reflects the new rule                      | click is a no-op        |
| `[data-testid="availability-save"]`                      | button | PUT /api/availability/bulk replaces all rules atomically                              | saved-at timestamp appears + GET returns same rules | request 4xx/5xx         |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                   | what request body or query is expected                           |
| ---------- | ------ | ---------------------- | ---------------------------------------------------------------- |
| mount      | GET    | /api/availability      | returns rules array (200; empty for fresh users)                 |
| save click | PUT    | /api/availability/bulk | { rules: [{ day_of_week, start_minute, end_minute, timezone }] } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/availability.spec.ts`
