# Page observations: /customers (Customers)

> Authenticated — operator's customer list. Heading "Customers", a
> search input, and a table/grid of customer rows showing name, email,
> visit count and last visit. Clicking a row navigates to /customers/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction                                        | success signal                         | failure signal                         |
| -------------------------- | ------- | ----------------------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| customer-name cells        | text    | render `name` for each customer returned by GET /api/customers          | every created name visible in the body | name missing after POST round-trip     |
| search input               | textbox | typing filters via GET /api/customers?search=…; list narrows to matches | only matching names remain visible     | other customers still listed           |
| visit-count column         | text    | reflects increment after a paid order for that customer's email         | count goes from 0 → 1 after pay        | count stays at 0 (invariant violation) |
| customer row link          | link    | click navigates to /customers/:id detail page                           | URL becomes /customers/<uuid>          | row click does nothing                 |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-customers.spec.ts`
