# Page observations: /bookings/:id (Booking Detail)

Detail card with confirmation code, check-in/check-out, guest count and
total. Sidebar with host meta + "Message host" CTA (creates a thread)
and a "View listing" link. Cancel reservation button when cancellable.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` and create a booking)

## Elements

| selector / accessible name                                              | role   | expected behavior on interaction                                                                                | success signal                             | failure signal |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------- |
| `getByRole('button', { name: /message host/i })`                        | button | POST /api/messages/threads with peer_id+listing_id, navigate to /messages/:threadId                             | URL becomes /messages/<uuid>, thread loads | error / no nav |
| `getByRole('link', { name: /view listing/i })`                          | link   | navigate to /listings/:listingId                                                                                | URL becomes /listings/<uuid>               | no navigation  |
| `getByRole('button', { name: /cancel reservation/i })` (if cancellable) | button | confirm dialog → PUT /api/bookings/:id/cancel; status flips to cancelled; subsequent GET shows status=cancelled | inline error if request fails              |
| Back-to-bookings fallback link (when not found)                         | link   | navigate to /bookings                                                                                           | URL becomes /bookings                      | broken         |
| Status badge                                                            | text   | reflects booking.status                                                                                         | badge text matches DB                      | wrong text     |

## Hidden surfaces opened from this page

(window.confirm dialog when cancelling — accept/dismiss)

| trigger            | what it opens  | elements inside (selector / role / behavior)              |
| ------------------ | -------------- | --------------------------------------------------------- |
| Cancel reservation | window.confirm | Native browser confirm — accept dispatches the cancel PUT |

## Network calls expected during normal use

| trigger       | method | path                     | what request body or query is expected        |
| ------------- | ------ | ------------------------ | --------------------------------------------- |
| initial mount | GET    | /api/bookings/:id        | 200 with full booking decoration              |
| message host  | POST   | /api/messages/threads    | { peer_id, listing_id } → 200/201 with { id } |
| cancel        | PUT    | /api/bookings/:id/cancel | { reason } → 200 with status=cancelled        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings__id.spec.ts`
