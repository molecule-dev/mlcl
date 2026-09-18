# Page observations: /trips/:id (TripDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (AuthGuard redirects unauthenticated visitors to `/login`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                        | success signal                                            | failure signal   |
| -------------------------------------------------- | ------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| `getByRole('heading', { level: 1 })`               | heading | renders the trip's property name                                        | text equals the trip's `property_name`                    | mismatch         |
| `getByRole('link', { name: /Back to trips/i })`    | link    | navigates back to `/trips`                                              | URL ends with `/trips`                                    | stays on detail  |
| `getByText(/Confirmation:\s+\w+/)`                 | text    | confirmation block exposes the `confirmation_number`                    | text starts with `Confirmation:`                          | empty            |
| `getByRole('link', { name: /View property/i })`    | link    | navigates to `/property/:id` for this trip                              | URL contains `/property/`                                 | stays on detail  |
| `getByRole('button', { name: /Cancel booking/i })` | button  | PUT `/api/trips/:id/cancel`; status flips to `cancelled` and re-renders | re-fetched `/api/trips/:id` returns `status: 'cancelled'` | status unchanged |

## Hidden surfaces opened from this page

| trigger             | what it opens                 | elements inside                                                         |
| ------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| Cancel confirmation | inline status flip (no modal) | status pill changes from `upcoming` to `cancelled`, Cancel button hides |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| Page load | GET    | /api/trips/:id        | returns the decorated trip             |
| Cancel    | PUT    | /api/trips/:id/cancel | returns the cancelled trip             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips__id.spec.ts`
