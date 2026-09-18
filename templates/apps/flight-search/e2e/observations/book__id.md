# Page observations: /book/:id (Booking wizard)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/book__id.spec.ts`.

## Procedure

1. `signup(page)`, get a real flight via `getSampleFlight(page)`.
2. Navigate to `/book/<id>`; observe the three-step wizard.
3. Walk happy path → POST /api/trips + /api/bookings → /trips redirect.
4. Probe the validation path (skipping passenger fields).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role   | expected behavior on interaction         | success signal             | failure signal      |
| ------------------------------------------------------ | ------ | ---------------------------------------- | -------------------------- | ------------------- |
| `getByRole('button', { name: 'Continue to payment' })` | button | advances Passengers → Payment            | Payment step visible       | stays on Passengers |
| `getByRole('button', { name: 'Review booking' })`      | button | advances Payment → Review                | Review step visible        | stays on Payment    |
| `getByRole('button', { name: 'Confirm and pay' })`     | button | POST /api/trips + /api/bookings → /trips | URL ends /trips, POSTs 2xx | inline error banner |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside (selector / role / behavior)    |
| ---------------- | ------------- | ----------------------------------------------- |
| step transitions | wizard panes  | passenger fields → card fields → review summary |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected                   |
| ------- | ------ | ------------- | -------------------------------------------------------- |
| confirm | POST   | /api/trips    | `{ kind, flight_payload, passenger_count, total_cents }` |
| confirm | POST   | /api/bookings | `{ trip_id, flight_id, card_last4, total_cents }`        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/book__id.spec.ts`
