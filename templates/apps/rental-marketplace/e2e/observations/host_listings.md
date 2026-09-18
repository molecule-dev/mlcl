# Page observations: /host/listings (Host Listings)

Host's portfolio of listings with status badge, location, nightly rate
and review meta. CTA "Create new listing" links to /host/listings/new.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; demo seed
      populates one host listing for fresh users)

## Elements

| selector / accessible name                                            | role | expected behavior on interaction | success signal                                           | failure signal       |
| --------------------------------------------------------------------- | ---- | -------------------------------- | -------------------------------------------------------- | -------------------- |
| `getByRole('link', { name: /create new listing/i })`                  | link | navigate to /host/listings/new   | URL becomes /host/listings/new, form renders             | no navigation        |
| Listing row link `page.locator('a[href^="/host/listings/"]').first()` | link | navigate to /host/listings/:id   | URL becomes /host/listings/<uuid>, detail editor renders | broken               |
| Status pill (Live/Paused/Archived/Draft)                              | text | reflects listing.status          | matches /api/host-listings payload                       | wrong text           |
| Nightly rate $/night                                                  | text | tabular-nums dollar string       | shows price for each listing                             | wrong format         |
| Star + review count (when review_count > 0)                           | text | shows rating · count             | matches API payload                                      | shown when 0 reviews |

## Hidden surfaces opened from this page

(none — flat list)

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| initial mount | GET    | /api/host-listings | 200 with `{ data: HostListing[] }`     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/host_listings.spec.ts`
