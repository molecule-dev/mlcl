# Page observations: /bookings/:id (BookingDetail)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] A booking exists for this user (seed via API)

## Elements

| selector / accessible name           | role         | expected behavior on interaction | success signal                     | failure signal  |
| ------------------------------------ | ------------ | -------------------------------- | ---------------------------------- | --------------- |
| `getByRole('heading')` first         | heading      | sitter name + service rendered   | rendered                           | missing         |
| `[data-mol-id="cta-cancel-booking"]` | button       | reveals confirm-cancel UI        | confirm button visible             | nothing happens |
| `[data-mol-id="cta-confirm-cancel"]` | button       | POST /api/bookings/:id/cancel    | booking.status becomes 'cancelled' | error toast     |
| message input + send button          | input/button | POST /api/bookings/:id/messages  | new message visible                | error toast     |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior)    |
| ------------------ | ------------- | ----------------------------------------------- |
| cta-cancel-booking | confirm group | cta-confirm-cancel button + Keep booking button |

## Network calls expected during normal use

| trigger            | method | path                       | what request body or query is expected |
| ------------------ | ------ | -------------------------- | -------------------------------------- |
| mount              | GET    | /api/bookings/:id          | booking details                        |
| mount              | GET    | /api/bookings/:id/messages | conversation messages                  |
| cta-confirm-cancel | POST   | /api/bookings/:id/cancel   | cancel booking                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings__id.spec.ts`
