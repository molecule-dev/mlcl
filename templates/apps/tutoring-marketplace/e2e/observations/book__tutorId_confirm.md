# Page observations: /book/:tutorId/confirm (BookingConfirmation)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (post-booking redirect target with ?bookingId=...)

## Elements

| selector / accessible name                               | role               | expected behavior on interaction                          | success signal                                | failure signal                                             |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| heading "Booking confirmed" / "You're booked"            | heading            | success header rendered                                   | visible                                       | missing                                                    |
| Booking summary tiles (With tutor / When / Subject)      | dl                 | reflects loaded booking row                               | tutor name, scheduled date, subject populated | "Tutor"/"—"/"Tutoring session" placeholder when no booking |
| `getByRole('link', { name: /add to google calendar/i })` | link               | URL → calendar.google.com/calendar/render?action=TEMPLATE | href contains calendar.google.com             | not a valid URL                                            |
| `getByRole('button', { name: /download \.ics             | download ics/i })` | button                                                    | downloads .ics blob >100 bytes                | download event with VCALENDAR contents                     | no download |
| `getByRole('link', { name: /message tutor                | chat/i })`         | link                                                      | navigates to /messages?with=:tutorId          | URL contains /messages?with=                               | nav fails   |
| `getByRole('link', { name: /view all sessions/i })`      | link               | navigates to /sessions                                    | URL is /sessions                              | nav fails                                                  |
| Receipt block (TUTOR / DURATION / RATE / TOTAL)          | dl                 | shows total + rate from booking                           | numeric values render                         | missing                                                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path              | what request body or query is expected                     |
| --------- | ------ | ----------------- | ---------------------------------------------------------- |
| page load | GET    | /api/bookings/:id | returns booking with tutor_name, hourly_rate, total_amount |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/book__tutorId_confirm.spec.ts`
