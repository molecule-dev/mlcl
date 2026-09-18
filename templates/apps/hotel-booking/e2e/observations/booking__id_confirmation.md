# Page observations: /booking/:id/confirmation (BookingConfirmation)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                             | success signal                                           | failure signal                |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------- |
| `getByRole('heading', { name: /Booking confirmed/i, level: 1 })` | heading | renders the confirmation header once the GET resolves        | heading is visible                                       | spinner / "Loading…" persists |
| `getByTestId('confirmation-number')`                             | text    | shows the trip's `confirmation_number` (or falls back to id) | text matches `confirmation_number` from `/api/trips/:id` | empty                         |
| `getByRole('link', { name: /View trip/i })`                      | link    | navigates to `/trips/:id` for the new reservation            | URL matches `/trips/<id>`                                | stays on confirmation         |
| `getByRole('link', { name: /All trips/i })`                      | link    | navigates to `/trips`                                        | URL ends with `/trips`                                   | stays on confirmation         |
| `getByRole('link', { name: /Browse more stays/i })`              | link    | navigates back to `/search`                                  | URL contains `/search`                                   | stays on confirmation         |

## Hidden surfaces opened from this page

| trigger        | what it opens                                  | elements inside               |
| -------------- | ---------------------------------------------- | ----------------------------- |
| Trip not found | `paragraph "Reservation not found"` empty card | text and a back-to-trips link |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected                                       |
| --------- | ------ | -------------- | ---------------------------------------------------------------------------- |
| Page load | GET    | /api/trips/:id | returns the decorated trip incl. `confirmation_number`, `total_cents`, dates |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/booking__id_confirmation.spec.ts`
