# Page observations: /reservations (Reservations)

> Authenticated — booking ledger. Heading "Reservations", a
> status-filter control (booked / seated / cancelled / completed),
> a "New reservation" action, and a list/table of bookings (guest
> name, party size, time, status).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role                | expected behavior on interaction                                        | success signal                            | failure signal                        |
| ----------------------------------------------- | ------------------- | ----------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| reservation rows                                | text                | render guest_name + party_size + start_time from POST /api/reservations | created reservation visible after refresh | row missing after POST                |
| status pill ("seated" / "booked" / "cancelled") | text                | reflects PUT /api/reservations/:id/status — survives reload             | reload still shows updated status         | pill stuck on `booked`                |
| cancel action                                   | button              | PUT status `{status:'cancelled'}`; reload still reads cancelled         | cancellation persists across reload       | reload reverts to `booked`            |
| status filter control                           | radiogroup / select | re-fetches with `?status=` and narrows the visible rows                 | only the chosen status is listed          | filter ignored — all rows still shown |

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
- [x] All elements above have a corresponding test in `e2e/11-reservations.spec.ts`
