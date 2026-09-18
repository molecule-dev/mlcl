# Page observations: /trips/:id (TripDetail)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/trips__id.spec.ts`.

## Procedure

1. `signup(page)` then `bookFlight()` to get a `booked` trip.
2. Navigate `/trips/<id>`; snapshot hero + Manage actions.
3. Click each Manage button; assert read-after-write on `flight_payload`.
4. Cancel trip; assert backend status flips to `cancelled`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                            | success signal                                | failure signal      |
| ---------------------------------------------- | ------- | ----------------------------------------------------------- | --------------------------------------------- | ------------------- |
| `getByRole(heading, level=1)`                  | heading | renders origin/destination route hero                       | text contains origin code                     | empty heading       |
| `getByTestId('trip-check-in')`                 | button  | POST /api/trips/:id/check-in → flight_payload.checked_in_at | row updated, button text "Checked in"         | 409/error           |
| `getByTestId('trip-change-flight')`            | button  | navigates /search with prefilled origin/destination         | URL has `?origin=&destination=`               | stays on /trips/:id |
| `getByTestId('trip-share')`                    | button  | uses navigator.share or copies URL to clipboard             | "Link copied" or share sheet opens            | no feedback         |
| `getByRole('button', { name: 'Cancel trip' })` | button  | PUT /api/trips/:id status=cancelled                         | status row goes to cancelled, redirect /trips | error toast         |

## Hidden surfaces opened from this page

| trigger     | what it opens  | elements inside (selector / role / behavior) |
| ----------- | -------------- | -------------------------------------------- |
| Cancel trip | confirm dialog | accept → backend cancel; dismiss → no-op     |

## Network calls expected during normal use

| trigger   | method | path                    | what request body or query is expected |
| --------- | ------ | ----------------------- | -------------------------------------- |
| page load | GET    | /api/trips/:id          | id from URL                            |
| check in  | POST   | /api/trips/:id/check-in | (empty body)                           |
| cancel    | PUT    | /api/trips/:id          | `{ status: 'cancelled' }`              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips__id.spec.ts`
