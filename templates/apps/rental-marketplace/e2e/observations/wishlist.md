# Page observations: /wishlist (Wishlist)

Saved listings grid grouped by collection (when present). Reads
`/api/bookmarks`. Each card is a `RoostListingCard` with the heart
filled — clicking removes the bookmark via `DELETE /api/bookmarks/:id`
optimistically (and re-adds on failure).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seed
      populates two wishlist entries on first authenticated request)

## Elements

| selector / accessible name                                             | role   | expected behavior on interaction                                         | success signal                             | failure signal     |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ | ------------------------------------------ | ------------------ |
| Collection filter chip `getByRole('button', { name: /All/i }).first()` | button | switch active collection filter                                          | grid filters to chosen collection          | filter not applied |
| Wishlist card link (if populated)                                      | link   | navigate to /listings/:id                                                | listing detail loads                       | no navigation      |
| Heart toggle on wishlist card                                          | button | DELETE /api/bookmarks/:id; card removed; subsequent GET reflects removal | bookmark not removed; comes back on reload |
| Browse-stays empty CTA `getByRole('link', { name: /browse stays/i })`  | link   | navigate to /search                                                      | URL becomes /search                        | no navigation      |

## Hidden surfaces opened from this page

(none — flat grid + collection chips)

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected          |
| ------------- | ------ | ------------------------- | ----------------------------------------------- |
| initial mount | GET    | /api/bookmarks            | 200 with `{ data: WishlistItem[] }`             |
| heart click   | DELETE | /api/bookmarks/:listingId | 204 / 200 — listing no longer in subsequent GET |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/wishlist.spec.ts`
