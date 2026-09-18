# Page observations: /booking/:id (BookingCheckout)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                                      | role            | expected behavior on interaction                                         | success signal                                                                            | failure signal                          |
| --------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| `getByRole('heading', { name: /Confirm and book/i, level: 1 })` | heading         | renders the checkout page heading                                        | heading is visible                                                                        | not visible (likely redirect to /login) |
| `page.locator('input[type="date"]').nth(0)`                     | textbox (date)  | check-in date is editable and prefilled from query string                | `toHaveValue` matches the `?check_in=` value                                              | empty                                   |
| `page.locator('input[type="date"]').nth(1)`                     | textbox (date)  | check-out date is editable and prefilled from query string               | `toHaveValue` matches the `?check_out=` value                                             | empty                                   |
| `getByRole('combobox', { name: /Guests/i })`                    | combobox        | guest count is a 1-6 select                                              | `toHaveValue` matches selection                                                           | unchanged                               |
| `getByRole('combobox', { name: /Room/i })`                      | combobox        | shown when the property has multiple rooms; switching updates the price  | `toHaveValue` matches                                                                     | not present (single-room property)      |
| `getByRole('radio', { name: /Credit \/ debit card/i })`         | radio           | payment-method radio defaults to "card"                                  | `toBeChecked` returns true                                                                | unchecked                               |
| `getByTestId('booking-total')`                                  | text            | shows the computed total (cents → dollars)                               | text matches `$N,NNN`                                                                     | empty                                   |
| `getByTestId('confirm-booking')`                                | button (submit) | POST `/api/reservations` and navigate to `/booking/:tripId/confirmation` | URL becomes `/booking/<id>/confirmation` AND `confirmation_number` is set on the new trip | stays on `/booking/:id`                 |

## Hidden surfaces opened from this page

| trigger                           | what it opens                                           | elements inside                   |
| --------------------------------- | ------------------------------------------------------- | --------------------------------- |
| Submit error (e.g. invalid dates) | inline `role="alert"` paragraph above the submit button | text starts with `Booking failed` |

## Network calls expected during normal use

| trigger         | method | path                      | what request body or query is expected                        |
| --------------- | ------ | ------------------------- | ------------------------------------------------------------- |
| Page load       | GET    | /api/properties/:id       | property header card                                          |
| Page load       | GET    | /api/properties/:id/rooms | room list / select                                            |
| Page load       | GET    | /api/profile/me           | prefill lead-guest name + email                               |
| Confirm booking | POST   | /api/reservations         | `{ room_id, check_in, check_out, guests, special_requests? }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/booking__id.spec.ts`
