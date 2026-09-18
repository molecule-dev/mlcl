# Page observations: /book/:slug/confirmed (Booking confirmation)

Public confirmation page; reads /api/bookings/by-token/:token, exposes calendar download + cancel.

Source: this page was driven live at `http://localhost:$VITE_PORT/book/:slug/confirmed`
via Playwright + the matching `e2e/book__slug_confirmed.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role   | expected behavior on interaction                              | success signal                                          | failure signal                               |
| --------------------------------------------- | ------ | ------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `[data-testid="booking-confirmation-status"]` | text   | eyebrow flips between "You're booked" and "Booking cancelled" | visible immediately on token-load                       | stays loading or shows error for valid token |
| `[data-testid="booking-confirmation-time"]`   | text   | shows scheduled time + day + timezone                         | block visible with formatted time                       | time block missing                           |
| `[data-testid="add-to-google"]`               | button | opens Google Calendar prefill in a new tab                    | click triggers window.open with calendar.google.com URL | noop                                         |
| `[data-testid="download-ics"]`                | button | downloads a real .ics blob                                    | browser triggers a download                             | noop                                         |
| `[data-testid="cancel-booking"]`              | button | POST /api/bookings/by-token/:token/cancel                     | status pill flips to cancelled and DB row reflects same | cancel never persists                        |

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
- [x] All elements above have a corresponding test in `e2e/book__slug_confirmed.spec.ts`
