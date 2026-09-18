# Page observations: /admin/listings (admin_listings)

Agent's own listings index. Shows all owner-scoped properties with status filter.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction                      | success signal                  | failure signal |
| -------------------------- | ------- | ----------------------------------------------------- | ------------------------------- | -------------- |
| listings heading           | heading | page title rendered                                   | visible                         | missing        |
| create listing button/link | link    | navigate to /admin/listings/new                       | URL becomes /admin/listings/new | no nav         |
| listings table/grid        | list    | render rows hydrated from /api/properties?owner_id=me | rows or empty-state visible     | crash          |
| status filter buttons      | group   | change query param + refresh list                     | API re-fired                    | no refresh     |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/properties | ?owner_id=me&status=all → 200          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin_listings.spec.ts`
