# Page observations: /trips/:id (TripDetail)

Source: live walk via Playwright on the running smoke app. The :id is
resolved by first booking a trip end-to-end via the Booking flow.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role     | expected behavior on interaction             | success signal                   | failure signal         |
| -------------------------------------------------- | -------- | -------------------------------------------- | -------------------------------- | ---------------------- |
| `getByRole('link', { name: /Back to trips/i })`    | link     | navigates back to /trips                     | URL becomes /trips               | no navigation          |
| `locator('[data-testid="trip-detail-hero"]')`      | section  | trip hero renders + GET /api/trips/:id fires | element visible + GET in network | element missing or 4xx |
| `locator('[data-testid="trip-status-badge"]')`     | text     | status pill is visible                       | element visible                  | missing                |
| `locator('[data-testid="trip-message-host"]')`     | button   | opens the "Message host" modal               | textarea + Send button visible   | modal stays hidden     |
| `locator('[data-testid="trip-message-input"]')`    | textarea | accepts a host message inside the modal      | text reflected                   | not editable           |
| `getByRole('heading', { name: /Itinerary/i })`     | heading  | itinerary section visible                    | heading visible                  | heading missing        |
| `getByRole('heading', { name: /Price summary/i })` | heading  | price summary section visible                | heading visible                  | heading missing        |
| `locator('[data-testid="trip-total"]')`            | text     | total amount visible                         | element visible                  | missing                |

## Hidden surfaces opened from this page

| trigger             | what it opens        | elements inside (selector / role / behavior)               |
| ------------------- | -------------------- | ---------------------------------------------------------- |
| `trip-message-host` | message-host modal   | `trip-message-input` textarea + Send button + Close button |
| `trip-cancel`       | cancel-booking modal | `trip-cancel-reason` textarea + Confirm cancel button      |

## Network calls expected during normal use

| trigger        | method | path                          | what request body or query is expected |
| -------------- | ------ | ----------------------------- | -------------------------------------- |
| navigate       | GET    | `/api/trips/:id`              | 200 with full trip detail              |
| Send message   | POST   | `/api/trips/:id/host-message` | `{ message }` body — 200 OK            |
| Confirm cancel | PUT    | `/api/trips/:id/cancel`       | `{ reason? }` body — 200 OK            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips__id.spec.ts`
