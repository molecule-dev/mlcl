# Page observations: /sessions/:id (SessionDetail)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated; the booking must belong to the logged-in user (owner-only)

## Elements

| selector / accessible name                         | role                | expected behavior on interaction                               | success signal                         | failure signal         |
| -------------------------------------------------- | ------------------- | -------------------------------------------------------------- | -------------------------------------- | ---------------------- |
| Booking metadata block                             | section             | renders tutor, scheduled_at, subject, duration                 | matches DB row                         | placeholders rendered  |
| `getByRole('button', { name: /start session/i })`  | button              | POST /api/sessions/start, flips booking status to in_progress  | tutoring_sessions row created          | error inline           |
| `getByRole('button', { name: /end session/i })`    | button              | POST /api/sessions/:id/end, flips session+booking to completed | session.completed_at populated         | no transition          |
| `getByRole('button', { name: /cancel booking/i })` | button              | PUT /api/bookings/:id/cancel, status→cancelled                 | booking.status='cancelled' on next GET | no flip                |
| `getByRole('link', { name: /chat                   | message tutor/i })` | link                                                           | navigates to /messages?with=           | URL contains /messages | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected  |
| --------- | ------ | -------------------------- | --------------------------------------- |
| page load | GET    | /api/bookings/:id          | returns booking + linked tutor          |
| page load | GET    | /api/bookings/:id/sessions | returns existing tutoring_sessions rows |
| start     | POST   | /api/sessions/start        | { booking_id } returns session row      |
| end       | POST   | /api/sessions/:id/end      | flips status + duration                 |
| cancel    | PUT    | /api/bookings/:id/cancel   | flips booking.status='cancelled'        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sessions__id.spec.ts`
