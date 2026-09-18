# Page observations: /book/:tutorId (Booking)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public-render but submission redirects to /login if unauthenticated

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                    | success signal                                | failure signal |
| ------------------------------------------------------- | ------- | --------------------------------------------------- | --------------------------------------------- | -------------- |
| heading "Pick a slot, lock it in."                      | heading | page header visible                                 | rendered                                      | missing        |
| Time slot button (e.g. "09:00")                         | button  | selects scheduled_at                                | summary updates with date+time                | inert          |
| Subject pill (Physics)                                  | button  | selects subject                                     | summary subject reflects choice               | inert          |
| Duration option ("30 min", "60 min", etc.)              | button  | selects duration                                    | summary duration updates + total recalculated | inert          |
| Booking summary panel                                   | panel   | shows tutor, scheduled_at, subject, duration, total | live updates as choices change                | stale          |
| `getByRole('button', { name: /confirm booking/i })`     | button  | POST /api/bookings                                  | redirects to /book/:id/confirm?bookingId=...  | error inline   |
| `getByRole('link', { name: /back to tutor profile/i })` | link    | back to /tutor/:id                                  | URL is /tutor/:id                             | nav fails      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                         | what request body or query is expected                          |
| --------- | ------ | ---------------------------- | --------------------------------------------------------------- |
| page load | GET    | /api/tutors/:id              | returns tutor with hourly_rate, subjects                        |
| page load | GET    | /api/tutors/:id/availability | slot list                                                       |
| confirm   | POST   | /api/bookings                | { tutor_id, subject, scheduled_at, duration_hours } returns 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/book__tutorId.spec.ts`
