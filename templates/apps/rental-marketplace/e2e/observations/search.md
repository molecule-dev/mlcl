# Page observations: /search (Search)

Listings grid with sort + price + amenity filters, a sticky map panel
with hover-driven price pin highlights. Reads `/api/listings` and
`/api/bookmarks`. Listing cards bookmark via `POST /api/bookmarks` /
`DELETE /api/bookmarks/:id` with optimistic UI rollback on failure.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role   | expected behavior on interaction | success signal                                                           | failure signal                         |
| -------------------------------------------------------------------- | ------ | -------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| `getByRole('combobox', { name: /sort/i })`                           | select | choose sort order                | grid re-orders by selection (price_asc → first card cheapest)            | order unchanged                        |
| Price filter button `getByRole('button', { name: /under \$200/i })`  | button | filter listings to < $200/night  | grid re-renders with only matching cards                                 | no filtering                           |
| Amenity filter button `getByRole('button', { name: /Wood stove/i })` | button | toggle amenity filter            | only listings with matching amenities show                               | no filtering                           |
| Listing card link `getByRole('link', { name: /night/i }).first()`    | link   | navigate to /listings/:id        | URL changes to /listings/<uuid>, detail page renders                     | navigation fails                       |
| Bookmark heart on listing card                                       | button | toggle bookmark                  | POST /api/bookmarks 201; subsequent GET /api/bookmarks shows the listing | bookmark not persisted; reload reverts |

## Hidden surfaces opened from this page

(none — flat grid + filters)

## Network calls expected during normal use

| trigger                      | method | path               | what request body or query is expected |
| ---------------------------- | ------ | ------------------ | -------------------------------------- |
| initial mount                | GET    | /api/listings      | 200 with seeded listings               |
| initial mount                | GET    | /api/bookmarks     | 200 with current user's bookmarks      |
| heart click                  | POST   | /api/bookmarks     | { listing_id } → 201                   |
| heart click (was bookmarked) | DELETE | /api/bookmarks/:id | 204 / 200                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
