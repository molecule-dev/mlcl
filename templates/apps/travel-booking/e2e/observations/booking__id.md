# Page observations: /booking/:id (Booking)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                      | role             | expected behavior on interaction                                               | success signal                                                 | failure signal          |
| ----------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------- |
| `getByRole('heading', { name: /Trip details/i })`                                               | heading          | booking page renders + GET /api/accommodations/:id + /rooms + /profile/me fire | heading visible + 3 GETs in network                            | heading missing or 4xx  |
| `locator('#booking-check-in')`                                                                  | input[type=date] | accepts an ISO date                                                            | input value reflected                                          | not editable            |
| `locator('#booking-check-out')`                                                                 | input[type=date] | accepts an ISO date                                                            | input value reflected                                          | not editable            |
| `locator('[data-testid="booking-guests"]')`                                                     | select           | guest count selector                                                           | option value updates                                           | not editable            |
| `locator('[data-testid="booking-special-requests"]')`                                           | textarea         | accepts free-form text                                                         | text reflected                                                 | not editable            |
| `locator('[data-testid="booking-agree-terms"]')`                                                | checkbox         | required for submit; flips checked state                                       | checked=true                                                   | does not flip           |
| `getByText(/Payment method/i)`                                                                  | heading          | payment section heading visible                                                | text visible                                                   | text missing            |
| `locator('[data-testid="booking-no-payment-method"], [data-testid="booking-payment-methods"]')` | container        | shows EITHER the no-saved-methods message OR the radio list of saved methods   | one is visible                                                 | both hidden             |
| `getByRole('button', { name: /Confirm booking                                                   | Confirm/i })`    | button                                                                         | submit posts /api/bookings; redirects to /trips/:id on success | URL becomes /trips/<id> | inline error visible |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                            | what request body or query is expected                                                |
| -------------- | ------ | ------------------------------- | ------------------------------------------------------------------------------------- |
| navigate       | GET    | `/api/accommodations/:id`       | 200 with property summary                                                             |
| navigate       | GET    | `/api/accommodations/:id/rooms` | 200 with array of room types                                                          |
| navigate       | GET    | `/api/profile/me`               | 200 with profile + saved payment methods                                              |
| Confirm submit | POST   | `/api/bookings`                 | `{ room_id, check_in, check_out, guests, special_requests, payment_method_id? }` body |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/booking__id.spec.ts`
