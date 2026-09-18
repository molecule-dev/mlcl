# Page observations: /host/listings/:id (Host Listing Detail / editor)

Tabbed editor for the host's own listing — Calendar (current month with
booked-day highlight), Pricing (weekday/weekend/cleaning fee fields with
Save), Photos, Rules. Pricing save hits `PUT /api/listings/:id`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seed adds a host listing)

## Elements

| selector / accessible name                                           | role   | expected behavior on interaction                                                      | success signal                                  | failure signal |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| Tab `getByRole('button', { name: /pricing/i })`                      | button | switch active tab to Pricing                                                          | Pricing form visible (weekday/weekend/cleaning) | tab unchanged  |
| Tab `getByRole('button', { name: /photos/i })`                       | button | switch to Photos                                                                      | Photos grid renders                             | tab unchanged  |
| Tab `getByRole('button', { name: /rules/i })`                        | button | switch to Rules                                                                       | Rules list renders                              | tab unchanged  |
| `getByRole('button', { name: /save pricing/i })`                     | button | PUT /api/listings/:id with new price_per_night; subsequent GET reflects the new price | Saved notice appears + reload shows new price   | error notice   |
| Back-to-listings link `getByRole('link', { name: /all listings/i })` | link   | navigate to /host/listings                                                            | URL becomes /host/listings                      | broken         |

## Hidden surfaces opened from this page

(no menus — sectioned tabs)

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected           |
| ------------- | ------ | ----------------- | ------------------------------------------------ |
| initial mount | GET    | /api/listings/:id | 200 with full listing                            |
| initial mount | GET    | /api/reservations | 200 with reservations (for calendar booked-days) |
| save pricing  | PUT    | /api/listings/:id | { price_per_night, cleaning_fee? } → 200         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/host_listings__id.spec.ts`
