# Page observations: /listings/:id (Listing Detail)

Hero gallery, host meta + about + amenities + house rules + reviews on
the left, sticky reservation card on the right (check-in/check-out,
guests, computed totals, reserve button). Reads `/api/listings/:id` and
`/api/reviews?listing_id=…`. Reserve POSTs `/api/bookings` and
navigates to `/bookings/:bookingId` (or `/bookings`) on success.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role              | expected behavior on interaction | success signal                                 | failure signal                                                             |
| ------------------------------------------------------------- | ----------------- | -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Check-in date `getByRole('textbox', { name: /check\s*in/i })` | input (type=date) | enter check-in date              | total recomputes once both dates set           | empty / invalid → reserve disabled                                         |
| Check-out date input                                          | input (type=date) | enter check-out date             | total recomputes; price-row breakdown appears  | mismatch / invalid → reserve disabled                                      |
| Guests select                                                 | combobox          | pick guest count                 | value updates                                  | no value retention                                                         |
| Reserve CTA `getByRole('button', { name: /reserve             | request/i })`     | button                           | POST /api/bookings → navigate to /bookings/:id | URL changes to /bookings/<uuid>, GET /api/bookings/:id returns the new row | inline error, stays on page |
| Browse other listings (404 fallback link)                     | link              | navigate to /search              | URL becomes /search                            | no navigation                                                              |

## Hidden surfaces opened from this page

(no menus — sticky reservation card with computed totals)

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected            |
| ------------- | ------ | --------------------------- | ------------------------------------------------- |
| initial mount | GET    | /api/listings/:id           | 200 with full listing payload                     |
| initial mount | GET    | /api/reviews?listing_id=:id | 200 with reviews array                            |
| reserve       | POST   | /api/bookings               | { listing_id, check_in, check_out, guests } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/listings__id.spec.ts`
