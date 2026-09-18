# Page observations: /bookings (Bookings)

Tabbed list of the signed-in user's bookings (`upcoming` / `past`)
fetched from `GET /api/bookings`. Each booking renders as a
`BookingItineraryRow` linking to `/bookings/:id`. Empty state offers a
"Browse stays" CTA back to /search.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                | role | expected behavior on interaction | success signal                                                | failure signal           |
| ------------------------------------------------------------------------- | ---- | -------------------------------- | ------------------------------------------------------------- | ------------------------ |
| Tab button `getByRole('tab', { name: /upcoming/i })`                      | tab  | switch to upcoming list          | aria-selected=true on this tab; populated list or empty state | wrong tab stays selected |
| Tab button `getByRole('tab', { name: /past/i })`                          | tab  | switch to past list              | aria-selected=true; past bookings or empty state              | doesn't switch           |
| Plan-another-trip CTA `getByRole('link', { name: /plan another trip/i })` | link | navigate to /search              | URL becomes /search                                           | no navigation            |
| Browse-stays empty CTA `getByRole('link', { name: /browse stays/i })`     | link | navigate to /search              | URL becomes /search                                           | no navigation            |
| Booking row link (when populated)                                         | link | navigate to /bookings/:id        | URL changes; detail loads                                     | broken                   |

## Hidden surfaces opened from this page

(none — flat list with two tabs)

## Network calls expected during normal use

| trigger       | method | path          | what request body or query is expected                      |
| ------------- | ------ | ------------- | ----------------------------------------------------------- |
| initial mount | GET    | /api/bookings | 200 with `{ data: Booking[] }`; empty array for fresh users |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings.spec.ts`
